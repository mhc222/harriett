import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk";
import { createServiceClient } from "@/lib/db/server";
import { writeAudit } from "@/lib/audit";
import { processingAcknowledgement } from "@/lib/ai/message-format";
import type { processAgentSms } from "@/trigger/process-agent-sms";
import {
  type AgentMessagingChannel,
  detectConsentIntent,
  twilioSendingEnabled,
  validTwilioSignature,
  STOP_CONFIRMATION,
  HELP_RESPONSE,
  START_CONFIRMATION,
} from "@/lib/sms";

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

  // Ordinary inbound message: store it, then let the durable task generate
  // and send the reply after this webhook has returned.
  const messageSid = params.MessageSid ?? null;
  const { data: msg, error: messageError } = await db
    .from("messages")
    .insert({
      office_id: agent.office_id,
      agent_id: agent.id,
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

  const acknowledgementCooldownStart = new Date(Date.now() - 90_000).toISOString();
  const acknowledgementHistoryStart = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: acknowledgementHistory, error: acknowledgementLookupError } = await db
    .from("audit_log")
    .select("payload, created_at")
    .eq("office_id", agent.office_id)
    .eq("agent_id", agent.id)
    .eq("action", `${channel}.processing_acknowledgement_decided`)
    .gte("created_at", acknowledgementHistoryStart)
    .order("created_at", { ascending: false })
    .limit(10);
  if (acknowledgementLookupError) {
    return NextResponse.json({ error: "acknowledgement history unavailable" }, { status: 503 });
  }
  const priorDecisions = (acknowledgementHistory ?? []).map((entry) => ({
    createdAt: entry.created_at,
    payload: entry.payload && typeof entry.payload === "object"
      ? entry.payload as Record<string, unknown>
      : null,
  }));
  const lastSentDecision = priorDecisions.find((entry) => entry.payload?.sent === true);
  const previousMessage = typeof lastSentDecision?.payload?.message === "string"
    ? lastSentDecision.payload.message
    : null;
  const recentlyAcknowledged = priorDecisions.some((entry) => (
    entry.createdAt >= acknowledgementCooldownStart && entry.payload?.sent === true
  ));
  const acknowledgement = processingAcknowledgement({
    body,
    seed: messageSid ?? msg.id,
    hasAttachments: mediaCount > 0,
    recentlyAcknowledged,
    previousMessage,
  });
  await writeAudit(db, {
    officeId: agent.office_id,
    actor: "harriett",
    agentId: agent.id,
    action: `${channel}.processing_acknowledgement_decided`,
    payload: {
      inboundMessageId: msg.id,
      sent: acknowledgement.message !== null,
      message: acknowledgement.message,
      category: acknowledgement.category,
      reason: acknowledgement.reason,
      delivery: acknowledgement.message ? "twiml" : null,
      cooldownSeconds: 90,
    },
  });

  await tasks.trigger<typeof processAgentSms>(
    "process-agent-sms",
    { messageId: msg.id },
    {
      idempotencyKey: ["twilio-inbound", channel, messageSid ?? msg.id],
      idempotencyKeyTTL: "7d",
      concurrencyKey: agent.id,
    }
  );

  return twiml(acknowledgement.message ?? undefined, channel);
}
