import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/server";
import { writeAudit } from "@/lib/audit";
import {
  detectConsentIntent,
  validTwilioSignature,
  STOP_CONFIRMATION,
  HELP_RESPONSE,
  START_CONFIRMATION,
} from "@/lib/sms";

function twiml(message?: string): NextResponse {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new NextResponse(body, { headers: { "Content-Type": "text/xml" } });
}

// Inbound SMS webhook. Service client is allowed here (webhook handler),
// and every action writes an audit row.
export async function POST(request: Request) {
  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw));
  const signature = request.headers.get("x-twilio-signature") ?? "";

  const url = process.env.TWILIO_WEBHOOK_URL ?? request.url;
  if (!validTwilioSignature(process.env.TWILIO_AUTH_TOKEN ?? "", url, params, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 403 });
  }

  const from = params.From ?? "";
  const body = params.Body ?? "";
  const db = createServiceClient();

  const { data: agent } = await db
    .from("agents")
    .select("id, office_id, name, phone, sms_consent")
    .eq("phone", from)
    .maybeSingle();

  if (!agent) {
    // Unknown sender: log and stay silent. Harriett only converses with
    // enrolled agents.
    const { data: office } = await db.from("offices").select("id").single();
    if (office) {
      await writeAudit(db, {
        officeId: office.id,
        actor: "system",
        action: "sms.unknown_sender",
        payload: { from, body: body.slice(0, 200) },
      });
    }
    return twiml();
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
    return twiml(STOP_CONFIRMATION);
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
    return twiml(START_CONFIRMATION);
  }

  if (consent?.intent === "help") {
    await db.from("consent_events").insert({
      office_id: agent.office_id,
      agent_id: agent.id,
      phone: from,
      event: "help",
      method: consent.method,
      evidence: { body },
    });
    return twiml(HELP_RESPONSE);
  }

  // Opted-out senders get silence beyond the one confirmation.
  if (agent.sms_consent === "opted_out") {
    await writeAudit(db, {
      officeId: agent.office_id,
      actor: "system",
      agentId: agent.id,
      action: "sms.suppressed_opted_out",
      payload: { body: body.slice(0, 200) },
    });
    return twiml();
  }

  // Ordinary inbound message: store it for the conversational loop.
  // Harriett's AI reply lands here in a later feature (Trigger.dev task).
  const { data: msg } = await db
    .from("messages")
    .insert({
      office_id: agent.office_id,
      agent_id: agent.id,
      direction: "inbound",
      channel: "sms",
      body,
      status: "delivered",
      provider_message_id: params.MessageSid ?? null,
    })
    .select("id")
    .single();
  await writeAudit(db, {
    officeId: agent.office_id,
    actor: "system",
    agentId: agent.id,
    action: "sms.received",
    payload: { messageId: msg?.id, sid: params.MessageSid },
  });

  return twiml();
}
