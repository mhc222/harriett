import { tasks } from "@trigger.dev/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { createServiceClient } from "@/lib/db/server";
import { decodeGmailPushData, GmailPushEnvelopeSchema } from "@/lib/google-monitoring";
import { GoogleIntegrationError, verifyGooglePubSubAuthorization } from "@/lib/integrations/google";
import type { syncGoogleMailbox } from "@/trigger/google-monitoring";

const GoogleConnectionSchema = z.object({
  id: z.string().uuid(),
  office_id: z.string().uuid(),
  agent_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    await verifyGooglePubSubAuthorization(request.headers.get("authorization"));
    const envelope = GmailPushEnvelopeSchema.parse(await request.json());
    const push = decodeGmailPushData(envelope.message.data);
    const db = createServiceClient();
    const { data, error } = await db
      .from("connections")
      .select("id, office_id, agent_id")
      .eq("provider", "google")
      .eq("status", "connected")
      .ilike("capabilities->>account_email", push.emailAddress)
      .maybeSingle();
    if (error) throw new Error(`Google connection lookup failed: ${error.message}`);
    if (!data) return NextResponse.json({ accepted: true, matched: false });
    const connection = GoogleConnectionSchema.parse(data);

    const run = await tasks.trigger<typeof syncGoogleMailbox>(
      "sync-google-mailbox",
      {
        connectionId: connection.id,
        notificationHistoryId: push.historyId,
        bootstrap: false,
      },
      {
        idempotencyKey: ["gmail-push", connection.id, envelope.message.messageId],
        idempotencyKeyTTL: "7d",
        concurrencyKey: connection.id,
      }
    );
    await writeAudit(db, {
      officeId: connection.office_id,
      actor: "system",
      agentId: connection.agent_id,
      action: "google.gmail_notification_received",
      payload: {
        connectionId: connection.id,
        historyId: push.historyId,
        pubsubMessageId: envelope.message.messageId,
        triggerRunId: run.id,
      },
    });
    return NextResponse.json({ accepted: true });
  } catch (error) {
    if (error instanceof GoogleIntegrationError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_notification" }, { status: 400 });
    }
    console.error("[google:gmail-webhook]", error);
    return NextResponse.json({ error: "notification_failed" }, { status: 503 });
  }
}
