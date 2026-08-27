import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk";
import { createServiceClient } from "@/lib/db/server";
import { writeAudit } from "@/lib/audit";
import { processingAcknowledgement } from "@/lib/ai/message-format";
import {
  conversationFastLaneEnabled,
  tryDeterministicConversationTurn,
} from "@/lib/conversation-gateway";
import type { processAgentSms } from "@/trigger/process-agent-sms";
import {
  type AgentMessagingChannel,
  detectConsentIntent,
  messageDeliveryMode,
  twilioSendingEnabled,
  validTwilioSignature,
  STOP_CONFIRMATION,
  HELP_RESPONSE,
  START_CONFIRMATION,
} from "@/lib/sms";

const RESPONSE_FEEDBACK_DEADLINE_MS = 2_500;
const RESPONSE_CHECK_INTERVAL_MS = 150;

function twiml(message?: string, channel: AgentMessagingChannel = "sms"): NextResponse {
  const reply = channel === "whatsapp" || twilioSendingEnabled() ? message : undefined;
  const escaped = reply
    ?.replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
  const body = reply
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new NextResponse(body, { headers: { "Content-Type": "text/xml" } });
}

function inboundChannel(from: string): AgentMessagingChannel {
  return from.startsWith("whatsapp:") ? "whatsapp" : "sms";
}

function phoneFromTwilioAddress(from: string): string {
  return from.startsWith("whatsapp:") ? from.slice("whatsapp:".length) : from;
}

function attachmentKind(mimeType: string): "image" | "document" | "audio" | "video" | "other" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "document";
  return "other";
}

async function waitForAcceptedReply(
  db: ReturnType<typeof createServiceClient>,
  inboundMessageId: string,
  channel: AgentMessagingChannel,
  deadlineAt: number
): Promise<boolean> {
  const deliveryMode = messageDeliveryMode(channel);
  while (Date.now() < deadlineAt) {
    const { data, error } = await db
      .from("messages")
      .select("status, provider_message_id")
      .eq("in_reply_to_id", inboundMessageId)
      .maybeSingle();
    if (error) throw new Error(`reply deadline lookup failed: ${error.message}`);
    if (data && (
      deliveryMode !== "live"
      || Boolean(data.provider_message_id)
      || ["sent", "delivered"].includes(data.status)
    )) {
      return true;
    }
    const remaining = deadlineAt - Date.now();
    if (remaining <= 0) break;
    await new Promise((resolve) => setTimeout(resolve, Math.min(RESPONSE_CHECK_INTERVAL_MS, remaining)));
  }
  return false;
}

// Inbound Twilio messaging webhook. Service client is allowed here (webhook handler),
// and every action writes an audit row.
export async function POST(request: Request) {
  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw));
  const signature = request.headers.get("x-twilio-signature") ?? "";

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return NextResponse.json({ error: "Twilio webhook is not configured" }, { status: 503 });
  }
  const url = process.env.TWILIO_WEBHOOK_URL ?? request.url;
  if (!validTwilioSignature(authToken, url, params, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 403 });
  }

  const providerFrom = params.From ?? "";
  const channel = inboundChannel(providerFrom);
  const from = phoneFromTwilioAddress(providerFrom);
  const body = params.Body ?? "";
  const db = createServiceClient();

  const { data: agent, error: agentLookupError } = await db
    .from("agents")
    .select("id, office_id, name, phone, sms_consent")
    .eq("phone", from)
    .maybeSingle();
  if (agentLookupError) {
    return NextResponse.json({ error: "agent lookup unavailable" }, { status: 503 });
  }

  if (!agent) {
    // Unknown sender: log and stay silent. Harriett only converses with
    // enrolled agents.
    const { data: office, error: officeLookupError } = await db.from("offices").select("id").single();
    if (officeLookupError) {
      return NextResponse.json({ error: "office lookup unavailable" }, { status: 503 });
    }
    if (office) {
      await writeAudit(db, {
        officeId: office.id,
        actor: "system",
        action: `${channel}.unknown_sender`,
        payload: { from, providerFrom, body: body.slice(0, 200) },
      });
    }
    return twiml(undefined, channel);
  }

  const consent = detectConsentIntent(body);

  if (consent?.intent === "opt_out") {
    await db
      .from("agents")
      .update({ sms_consent: "opted_out", sms_consent_at: new Date().toISOString() })
      .eq("id", agent.id);
    await db.from("consent_events").insert({
      office_id: agent.office_id,
      agent_id: agent.id,
      phone: from,
      channel,
      event: "opt_out",
      method: consent.method,
      evidence: { body },
    });
    await writeAudit(db, {
      officeId: agent.office_id,
      actor: "system",
      agentId: agent.id,
      action: "consent.opted_out",
      payload: { method: consent.method },
    });
    // One confirmation message is allowed after an opt-out; then silence.
    return twiml(STOP_CONFIRMATION, channel);
  }

  if (consent?.intent === "opt_in") {
    await db
      .from("agents")
      .update({ sms_consent: "opted_in", sms_consent_at: new Date().toISOString() })
      .eq("id", agent.id);
    await db.from("consent_events").insert({
      office_id: agent.office_id,
      agent_id: agent.id,
      phone: from,
      channel,
      event: "opt_in",
      method: consent.method,
      evidence: { body },
    });
    await writeAudit(db, {
      officeId: agent.office_id,
      actor: "system",
      agentId: agent.id,
      action: "consent.opted_in",
      payload: { method: consent.method },
    });
    return twiml(START_CONFIRMATION, channel);
  }

  if (consent?.intent === "help") {
    await db.from("consent_events").insert({
      office_id: agent.office_id,
      agent_id: agent.id,
      phone: from,
      channel,
      event: "help",
      method: consent.method,
      evidence: { body },
    });
    return twiml(HELP_RESPONSE, channel);
  }

  // Opted-out senders get silence beyond the one confirmation.
  if (agent.sms_consent === "opted_out") {
    await writeAudit(db, {
      officeId: agent.office_id,
      actor: "system",
      agentId: agent.id,
      action: `${channel}.suppressed_opted_out`,
      payload: { body: body.slice(0, 200) },
    });
    return twiml(undefined, channel);
  }

  // Keep each provider channel on a stable thread so references such as
  // "post it" and "delete it" have an explicit conversation scope.
  const { data: existingThread, error: threadLookupError } = await db
    .from("threads")
    .select("id")
    .eq("office_id", agent.office_id)
    .eq("agent_id", agent.id)
    .eq("channel", channel)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (threadLookupError) {
    return NextResponse.json({ error: "conversation lookup failed" }, { status: 503 });
  }
  let thread = existingThread;
  if (!thread) {
    const createdThread = await db.from("threads").insert({
      office_id: agent.office_id,
      agent_id: agent.id,
      channel,
      subject: "Harriett conversation",
    }).select("id").single();
    if (createdThread.error || !createdThread.data) {
      return NextResponse.json({ error: "conversation creation failed" }, { status: 500 });
    }
    thread = createdThread.data;
  }

  // Ordinary inbound message: store it, then let the durable task generate
  // and send the reply.
  const messageSid = params.MessageSid ?? null;
  const { data: msg, error: messageError } = await db
    .from("messages")
    .insert({
      office_id: agent.office_id,
      agent_id: agent.id,
      thread_id: thread.id,
      direction: "inbound",
      channel,
      body,
      status: "delivered",
      provider_message_id: messageSid,
    })
    .select("id")
    .single();

  if (messageError) {
    if (messageError.code === "23505" && messageSid) {
      const { data: existing } = await db
        .from("messages")
        .select("id")
        .eq("provider_message_id", messageSid)
        .single();
      if (!existing) {
        return NextResponse.json({ error: "duplicate message lookup failed" }, { status: 500 });
      }
      await tasks.trigger<typeof processAgentSms>(
        "process-agent-sms",
        { messageId: existing.id },
        { idempotencyKey: ["twilio-inbound", channel, messageSid], idempotencyKeyTTL: "7d" }
      );
      return twiml(undefined, channel);
    }
    return NextResponse.json({ error: "message storage failed" }, { status: 500 });
  }

  const mediaCount = Math.min(Number.parseInt(params.NumMedia ?? "0", 10) || 0, 10);
  if (mediaCount > 0) {
    const attachments = Array.from({ length: mediaCount }, (_, index) => {
      const mimeType = params[`MediaContentType${index}`] ?? "application/octet-stream";
      return {
        office_id: agent.office_id,
        message_id: msg.id,
        kind: attachmentKind(mimeType),
        source: "twilio",
        url: params[`MediaUrl${index}`],
        mime_type: mimeType,
      };
    }).filter((attachment) => Boolean(attachment.url));
    if (attachments.length) {
      const { error: attachmentError } = await db.from("message_attachments").insert(attachments);
      if (attachmentError) {
        return NextResponse.json({ error: "message attachment storage failed" }, { status: 500 });
      }
    }
  }

  await writeAudit(db, {
    officeId: agent.office_id,
    actor: "system",
    agentId: agent.id,
    action: `${channel}.received`,
    payload: { messageId: msg.id, sid: messageSid, mediaCount },
  });

  // The new conversation runtime is opt-in until migration 0033 is applied
  // and the deterministic lane has passed production pilot checks. Any
  // failure falls through to the existing durable task. sendAgentMessage()
  // enforces one reply per inbound message, so the fallback cannot duplicate
  // a provider-accepted response.
  if (conversationFastLaneEnabled(agent.id) && mediaCount === 0) {
    try {
      const deterministic = await tryDeterministicConversationTurn(db, {
        officeId: agent.office_id,
        agentId: agent.id,
        inboundMessageId: msg.id,
        providerMessageId: messageSid ?? undefined,
        channel,
        body,
      });
      if (deterministic) return twiml(undefined, channel);
    } catch (error) {
      await writeAudit(db, {
        officeId: agent.office_id,
        actor: "harriett",
        agentId: agent.id,
        action: `${channel}.deterministic_reply_fell_back`,
        payload: {
          inboundMessageId: msg.id,
          error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
        },
      });
    }
  }

  const feedbackDeadlineAt = Date.now() + RESPONSE_FEEDBACK_DEADLINE_MS;
  const task = await tasks.trigger<typeof processAgentSms>(
    "process-agent-sms",
    { messageId: msg.id },
    {
      idempotencyKey: ["twilio-inbound", channel, messageSid ?? msg.id],
      idempotencyKeyTTL: "7d",
      concurrencyKey: agent.id,
    }
  );

  let replyAccepted = false;
  try {
    replyAccepted = await waitForAcceptedReply(db, msg.id, channel, feedbackDeadlineAt);
  } catch (error) {
    await writeAudit(db, {
      officeId: agent.office_id,
      actor: "system",
      agentId: agent.id,
      action: `${channel}.reply_deadline_check_failed`,
      payload: {
        inboundMessageId: msg.id,
        taskId: task.id,
        error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
      },
    });
  }

  const acknowledgement = replyAccepted
    ? { message: null, category: null, reason: "reply_accepted_before_deadline" as const }
    : processingAcknowledgement({
        body,
        seed: messageSid ?? msg.id,
        hasAttachments: mediaCount > 0,
        deadlineExpired: true,
      });
  await writeAudit(db, {
    officeId: agent.office_id,
    actor: "harriett",
    agentId: agent.id,
    action: `${channel}.processing_acknowledgement_decided`,
    payload: {
      inboundMessageId: msg.id,
      taskId: task.id,
      sent: acknowledgement.message !== null,
      message: acknowledgement.message,
      category: acknowledgement.category,
      reason: acknowledgement.reason,
      delivery: acknowledgement.message ? "twiml" : null,
      deadlineMs: RESPONSE_FEEDBACK_DEADLINE_MS,
    },
  });

  return twiml(acknowledgement.message ?? undefined, channel);
}
