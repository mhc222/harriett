import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/server";
import { writeAudit } from "@/lib/audit";
import { validTwilioSignature } from "@/lib/sms";

function localStatus(twilioStatus: string): "queued" | "sent" | "delivered" | "failed" {
  if (twilioStatus === "delivered" || twilioStatus === "read") return "delivered";
  if (twilioStatus === "sent" || twilioStatus === "sending") return "sent";
  if (["failed", "undelivered", "canceled"].includes(twilioStatus)) return "failed";
  return "queued";
}

export async function POST(request: Request) {
  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw));
  const signature = request.headers.get("x-twilio-signature") ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return NextResponse.json({ error: "Twilio webhook is not configured" }, { status: 503 });
  }
  const url = process.env.TWILIO_STATUS_CALLBACK_URL ?? request.url;

  if (!validTwilioSignature(authToken, url, params, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 403 });
  }

  const messageSid = params.MessageSid;
  if (!messageSid) {
    return NextResponse.json({ error: "MessageSid is required" }, { status: 400 });
  }

  const db = createServiceClient();
  const { data: message } = await db
    .from("messages")
    .select("id, office_id, agent_id, deal_id, status")
    .eq("provider_message_id", messageSid)
    .maybeSingle();

  if (!message) return new NextResponse(null, { status: 204 });

  const status = localStatus(params.MessageStatus ?? "queued");
  const { error } = await db.from("messages").update({ status }).eq("id", message.id);
  if (error) {
    return NextResponse.json({ error: "status update failed" }, { status: 500 });
  }

  await writeAudit(db, {
    officeId: message.office_id,
    actor: "system",
    agentId: message.agent_id,
    dealId: message.deal_id ?? undefined,
    action: "sms.delivery_updated",
    payload: {
      messageId: message.id,
      previousStatus: message.status,
      status,
      providerStatus: params.MessageStatus,
      errorCode: params.ErrorCode || undefined,
    },
  });

  return new NextResponse(null, { status: 204 });
}
