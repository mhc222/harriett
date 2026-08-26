import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAudit } from "./audit";

// ---------------------------------------------------------------------------
// Twilio webhook signature validation (required on every inbound webhook)
// ---------------------------------------------------------------------------

export function validTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join("");
  const expected = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Consent intent detection. Opt-outs are honored by any reasonable means,
// not just keywords (CLAUDE.md hard rule). Keyword matches satisfy the
// carrier-standard words; phrase patterns catch natural language.
// ---------------------------------------------------------------------------

export type ConsentIntent = "opt_out" | "opt_in" | "help";

const OPT_OUT_KEYWORDS = new Set([
  "stop", "stopall", "stop all", "unsubscribe", "cancel", "end", "quit",
  "revoke", "optout", "opt out",
]);
const OPT_IN_KEYWORDS = new Set(["start", "unstop", "subscribe"]);
const HELP_KEYWORDS = new Set(["help", "info"]);

const OPT_OUT_PHRASES = [
  /\bstop (texting|messaging|contacting)\b/i,
  /\b(don'?t|do not) (text|message|contact)\b/i,
  /\bno more (texts|messages)\b/i,
  /\bremove me\b/i,
  /\btake me off\b/i,
  /\bleave me alone\b/i,
  /\bwrong number\b/i,
  /\bnot interested in (these|your) (texts|messages)\b/i,
];

export function detectConsentIntent(body: string): {
  intent: ConsentIntent;
  method: "keyword" | "natural_language";
} | null {
  const normalized = body.trim().toLowerCase().replace(/[.!?]+$/, "");
  if (OPT_OUT_KEYWORDS.has(normalized)) return { intent: "opt_out", method: "keyword" };
  if (OPT_IN_KEYWORDS.has(normalized)) return { intent: "opt_in", method: "keyword" };
  if (HELP_KEYWORDS.has(normalized)) return { intent: "help", method: "keyword" };
  if (OPT_OUT_PHRASES.some((p) => p.test(body))) {
    return { intent: "opt_out", method: "natural_language" };
  }
  return null;
}

// Copy must match the A2P registration samples (docs/a2p-10dlc-checklist.md).
export const STOP_CONFIRMATION =
  "Pritchett-Moore Real Estate: You're unsubscribed from all Harriett text messages. No further messages will be sent. Text START to re-enroll.";
export const HELP_RESPONSE =
  "Harriett, Pritchett-Moore Real Estate's transaction assistant. For help, call 205-349-6535 or email relocation@pritchett-moore.com. Reply STOP to opt out.";
export const START_CONFIRMATION =
  "Pritchett-Moore Real Estate: You're enrolled in recurring Harriett agent text messages for transaction alerts, reminders, scheduling, and replies. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to opt out.";

// ---------------------------------------------------------------------------
// Use-case drift guardrail. Outbound content must stay inside the registered
// campaign use case; SHAFT content is blocked in the send path.
// ponytail: keyword screen; a Haiku fast-tier classifier layers on top later.
// ---------------------------------------------------------------------------

const SHAFT_PATTERN =
  /\b(sex|sexual|porn|nude|escort|viagra|cannabis|marijuana|weed|cocaine|heroin|meth|beer|wine|whiskey|vodka|liquor|casino|gambl\w*|lottery|betting|gun|guns|firearm\w*|ammo|ammunition|rifle|pistol|vape|vaping|cigarette\w*|tobacco|nicotine)\b/i;

export function smsGuardrailViolation(body: string): string | null {
  const match = body.match(SHAFT_PATTERN);
  return match ? match[0].toLowerCase() : null;
}

// ---------------------------------------------------------------------------
// Consent-gated send path. Every outbound SMS goes through here: consent
// check, guardrail, message row, Twilio call, audit. No fire-and-forget.
// ---------------------------------------------------------------------------

interface AgentRow {
  id: string;
  office_id: string;
  name: string;
  phone: string | null;
  sms_consent: string;
}

export type AgentMessagingChannel = "sms" | "whatsapp";
export type DeliveryStatus = "queued" | "sent" | "delivered" | "failed";

export function localDeliveryStatus(twilioStatus: string): DeliveryStatus {
  if (twilioStatus === "delivered" || twilioStatus === "read") return "delivered";
  if (twilioStatus === "sent" || twilioStatus === "sending") return "sent";
  if (["failed", "undelivered", "canceled"].includes(twilioStatus)) return "failed";
  return "queued";
}

export function resolveDeliveryStatus(
  currentStatus: string,
  providerStatus: string
): { status: DeliveryStatus; changed: boolean } {
  const incoming = localDeliveryStatus(providerStatus);
  if (currentStatus === "failed") return { status: "failed", changed: false };
  if (incoming === "failed") return { status: "failed", changed: currentStatus !== "failed" };
  const rank: Record<Exclude<DeliveryStatus, "failed">, number> = {
    queued: 0,
    sent: 1,
    delivered: 2,
  };
  const currentRank = currentStatus in rank
    ? rank[currentStatus as keyof typeof rank]
    : -1;
  return incoming in rank && rank[incoming as keyof typeof rank] > currentRank
    ? { status: incoming, changed: true }
    : { status: (currentStatus in rank ? currentStatus : incoming) as DeliveryStatus, changed: false };
}

export function validateAgentMediaUrls(channel: AgentMessagingChannel, mediaUrls?: string[]): string[] {
  if (!mediaUrls?.length) return [];
  if (channel !== "whatsapp") {
    throw new Error("media attachments are currently enabled for WhatsApp only");
  }
  if (mediaUrls.length > 10) throw new Error("a WhatsApp message can include at most 10 media URLs");
  return mediaUrls.map((value) => {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new Error("WhatsApp media URLs must use HTTPS");
    return url.toString();
  });
}

export function twilioSendingEnabled(): boolean {
  return messageDeliveryMode("sms") === "live";
}

export function smsDeliveryMode(): "disabled" | "dry_run" | "live" {
  return messageDeliveryMode("sms");
}

export function messageDeliveryMode(channel: AgentMessagingChannel): "disabled" | "dry_run" | "live" {
  if (channel === "whatsapp") {
    const whatsappMode = process.env.WHATSAPP_DELIVERY_MODE;
    if (whatsappMode === "live" || whatsappMode === "dry_run" || whatsappMode === "disabled") {
      return whatsappMode;
    }
  }

  const explicitMode = process.env.SMS_DELIVERY_MODE;
  if (explicitMode === "live" || explicitMode === "dry_run" || explicitMode === "disabled") {
    return explicitMode;
  }
  return "dry_run";
}

function requiredTwilioSendConfig(channel: AgentMessagingChannel): {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  statusCallbackUrl?: string;
} {
  if (messageDeliveryMode(channel) !== "live") {
    throw new Error(`${channel.toUpperCase()} sending is disabled; set its delivery mode to live to enable it`);
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = channel === "whatsapp"
    ? process.env.TWILIO_WHATSAPP_FROM
    : process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error(`Twilio ${channel} is enabled but its account SID, auth token, or sender is missing`);
  }

  return {
    accountSid,
    authToken,
    fromNumber,
    statusCallbackUrl:
      (channel === "whatsapp"
        ? process.env.TWILIO_WHATSAPP_STATUS_CALLBACK_URL
        : process.env.TWILIO_STATUS_CALLBACK_URL) || undefined,
  };
}

export function assertSendAllowed(agent: AgentRow): void {
  if (!agent.phone) throw new Error(`agent ${agent.id} has no phone number`);
  if (agent.sms_consent !== "opted_in") {
    throw new Error(`agent ${agent.id} is not opted in (${agent.sms_consent})`);
  }
}

function assertAgentMessageAllowed(agent: AgentRow, channel: AgentMessagingChannel): void {
  if (!agent.phone) throw new Error(`agent ${agent.id} has no phone number`);
  if (channel === "whatsapp") {
    if (agent.sms_consent === "opted_out") {
      throw new Error(`agent ${agent.id} is opted out`);
    }
    return;
  }
  assertSendAllowed(agent);
}

export async function sendAgentSms(
  db: SupabaseClient,
  opts: { agentId: string; body: string; dealId?: string; inReplyToId?: string }
): Promise<{ messageId: string; providerMessageId?: string; dryRun?: boolean }> {
  return sendAgentMessage(db, { ...opts, channel: "sms" });
}

export async function sendAgentMessage(
  db: SupabaseClient,
  opts: {
    agentId: string;
    body: string;
    channel: AgentMessagingChannel;
    dealId?: string;
    inReplyToId?: string;
    mediaUrls?: string[];
  }
): Promise<{ messageId: string; providerMessageId?: string; dryRun?: boolean }> {
  const { data: agent, error } = await db
    .from("agents")
    .select("id, office_id, name, phone, sms_consent")
    .eq("id", opts.agentId)
    .single();
  if (error || !agent) throw new Error(`agent ${opts.agentId} not found`);

  assertAgentMessageAllowed(agent, opts.channel);
  const mediaUrls = validateAgentMediaUrls(opts.channel, opts.mediaUrls);
  const deliveryMode = messageDeliveryMode(opts.channel);
  const twilioConfig = deliveryMode === "live" ? requiredTwilioSendConfig(opts.channel) : null;

  const violation = smsGuardrailViolation(opts.body);
  if (violation) {
    await writeAudit(db, {
      officeId: agent.office_id,
      actor: "harriett",
      agentId: agent.id,
      dealId: opts.dealId,
      action: `${opts.channel}.blocked_guardrail`,
      payload: { violation, body: opts.body },
    });
    throw new Error(`${opts.channel} blocked by content guardrail: ${violation}`);
  }

  let msg: { id: string; provider_message_id: string | null } | null = null;
  if (opts.inReplyToId) {
    const { data: existing } = await db
      .from("messages")
      .select("id, provider_message_id, status")
      .eq("in_reply_to_id", opts.inReplyToId)
      .maybeSingle();
    if (existing?.provider_message_id) {
      return { messageId: existing.id, providerMessageId: existing.provider_message_id };
    }
    if (existing && deliveryMode === "dry_run" && existing.status !== "failed") {
      return { messageId: existing.id, dryRun: true };
    }
    msg = existing;
  }

  if (!msg) {
    const { data: inserted, error: msgError } = await db
      .from("messages")
      .insert({
        office_id: agent.office_id,
        deal_id: opts.dealId ?? null,
        agent_id: agent.id,
        direction: "outbound",
        channel: opts.channel,
        body: opts.body,
        consumer_facing: false,
        status: "queued",
        in_reply_to_id: opts.inReplyToId ?? null,
      })
      .select("id, provider_message_id")
      .single();
    if (msgError || !inserted) throw new Error(`message row failed: ${msgError?.message}`);
    msg = inserted;
  }

  if (mediaUrls.length) {
    const { error: attachmentError } = await db.from("message_attachments").upsert(
      mediaUrls.map((url) => ({
        office_id: agent.office_id,
        message_id: msg!.id,
        kind: "image",
        source: "external",
        url,
      })),
      { onConflict: "message_id,url" }
    );
    if (attachmentError) {
      throw new Error(`message attachment storage failed: ${attachmentError.message}`);
    }
  }

  if (deliveryMode === "dry_run") {
    await db
      .from("messages")
      .update({ status: "draft", sent_at: null, provider_message_id: null })
      .eq("id", msg.id);
    await writeAudit(db, {
      officeId: agent.office_id,
      actor: "harriett",
      agentId: agent.id,
      dealId: opts.dealId,
      action: `${opts.channel}.dry_run_saved`,
      payload: { messageId: msg.id },
    });
    return { messageId: msg.id, dryRun: true };
  }

  if (deliveryMode === "disabled") {
    await db.from("messages").update({ status: "draft" }).eq("id", msg.id);
    await writeAudit(db, {
      officeId: agent.office_id,
      actor: "harriett",
      agentId: agent.id,
      dealId: opts.dealId,
      action: `${opts.channel}.send_skipped_disabled`,
      payload: { messageId: msg.id },
    });
    return { messageId: msg.id };
  }

  const to = opts.channel === "whatsapp" ? `whatsapp:${agent.phone!}` : agent.phone!;

  const form = new URLSearchParams({
    To: to,
    From: twilioConfig!.fromNumber,
    Body: opts.body,
    ...(twilioConfig!.statusCallbackUrl
      ? { StatusCallback: twilioConfig!.statusCallbackUrl }
      : {}),
  });
  mediaUrls.forEach((url) => form.append("MediaUrl", url));

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioConfig!.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${twilioConfig!.accountSid}:${twilioConfig!.authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    }
  );

  if (!res.ok) {
    const detail = await res.text();
    await db.from("messages").update({ status: "failed" }).eq("id", msg.id);
    await writeAudit(db, {
      officeId: agent.office_id,
      actor: "harriett",
      agentId: agent.id,
      dealId: opts.dealId,
      action: `${opts.channel}.failed`,
      payload: { messageId: msg.id, status: res.status, detail: detail.slice(0, 500) },
    });
    throw new Error(`twilio send failed (${res.status})`);
  }

  const twilio = (await res.json()) as { sid: string };
  await db
    .from("messages")
    .update({ status: "sent", provider_message_id: twilio.sid, sent_at: new Date().toISOString() })
    .eq("id", msg.id);
  await writeAudit(db, {
    officeId: agent.office_id,
    actor: "harriett",
    agentId: agent.id,
    dealId: opts.dealId,
    action: `${opts.channel}.sent`,
    payload: { messageId: msg.id, providerMessageId: twilio.sid, mediaCount: mediaUrls.length },
  });

  return { messageId: msg.id, providerMessageId: twilio.sid };
}
