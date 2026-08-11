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

export function assertSendAllowed(agent: AgentRow): void {
  if (!agent.phone) throw new Error(`agent ${agent.id} has no phone number`);
  if (agent.sms_consent !== "opted_in") {
    throw new Error(`agent ${agent.id} is not opted in (${agent.sms_consent})`);
  }
}

export async function sendAgentSms(
  db: SupabaseClient,
  opts: { agentId: string; body: string; dealId?: string }
): Promise<{ messageId: string; providerMessageId: string }> {
  const { data: agent, error } = await db
    .from("agents")
    .select("id, office_id, name, phone, sms_consent")
    .eq("id", opts.agentId)
    .single();
  if (error || !agent) throw new Error(`agent ${opts.agentId} not found`);

  assertSendAllowed(agent);

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

  const { data: msg, error: msgError } = await db
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
    })
    .select("id")
    .single();
  if (msgError || !msg) throw new Error(`message row failed: ${msgError?.message}`);

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: agent.phone!,
        From: process.env.TWILIO_FROM_NUMBER!,
        Body: opts.body,
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
