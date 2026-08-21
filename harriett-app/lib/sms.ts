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
  "You've been unsubscribed from Harriett texts and won't receive further messages. Contact the office to re-enroll.";
export const HELP_RESPONSE =
  "Harriett, Pritchett-Moore Real Estate's transaction assistant. For support, contact matt@pdlabs.xyz or call the office. Reply STOP to opt out of texts.";
export const START_CONFIRMATION =
  "Pritchett-Moore Real Estate: You're all set. I'm Harriett, your transaction assistant. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to opt out.";

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

export function twilioSendingEnabled(): boolean {
  return smsDeliveryMode() === "live";
}

export function smsDeliveryMode(): "disabled" | "dry_run" | "live" {
  const explicitMode = process.env.SMS_DELIVERY_MODE;
  if (explicitMode === "live" || explicitMode === "dry_run" || explicitMode === "disabled") {
    return explicitMode;
  }
  return "dry_run";
}

function requiredTwilioSendConfig(): {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  statusCallbackUrl?: string;
} {
  if (!twilioSendingEnabled()) {
    throw new Error("SMS sending is disabled; set SMS_DELIVERY_MODE=live to enable it");
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Twilio SMS is enabled but its account SID, auth token, or sender number is missing");
  }

  return {
    accountSid,
    authToken,
    fromNumber,
    statusCallbackUrl: process.env.TWILIO_STATUS_CALLBACK_URL || undefined,
  };
}

export function assertSendAllowed(agent: AgentRow): void {
  if (!agent.phone) throw new Error(`agent ${agent.id} has no phone number`);
  if (agent.sms_consent !== "opted_in") {
    throw new Error(`agent ${agent.id} is not opted in (${agent.sms_consent})`);
  }
}

export async function sendAgentSms(
  db: SupabaseClient,
  opts: { agentId: string; body: string; dealId?: string; inReplyToId?: string }
): Promise<{ messageId: string; providerMessageId?: string; dryRun?: boolean }> {
  const { data: agent, error } = await db
    .from("agents")
    .select("id, office_id, name, phone, sms_consent")
    .eq("id", opts.agentId)
    .single();
  if (error || !agent) throw new Error(`agent ${opts.agentId} not found`);

  assertSendAllowed(agent);
  const deliveryMode = smsDeliveryMode();
  const twilioConfig = deliveryMode === "live" ? requiredTwilioSendConfig() : null;

  const violation = smsGuardrailViolation(opts.body);
  if (violation) {
    await writeAudit(db, {
      officeId: agent.office_id,
      actor: "harriett",
      agentId: agent.id,
      dealId: opts.dealId,
      action: "sms.blocked_guardrail",
      payload: { violation, body: opts.body },
    });
    throw new Error(`sms blocked by content guardrail: ${violation}`);
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
        channel: "sms",
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
      action: "sms.dry_run_saved",
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
      action: "sms.send_skipped_disabled",
      payload: { messageId: msg.id },
    });
    return { messageId: msg.id };
  }

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
      body: new URLSearchParams({
        To: agent.phone!,
        From: twilioConfig!.fromNumber,
        Body: opts.body,
        ...(twilioConfig!.statusCallbackUrl
          ? { StatusCallback: twilioConfig!.statusCallbackUrl }
          : {}),
      }),
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
      action: "sms.failed",
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
    action: "sms.sent",
    payload: { messageId: msg.id, providerMessageId: twilio.sid },
  });

  return { messageId: msg.id, providerMessageId: twilio.sid };
}
