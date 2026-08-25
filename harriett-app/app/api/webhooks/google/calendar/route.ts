import { tasks } from "@trigger.dev/sdk";
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { createServiceClient } from "@/lib/db/server";
import { hashGoogleChannelToken } from "@/lib/google-monitoring";
import type { syncGoogleCalendar } from "@/trigger/google-monitoring";

const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  office_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  connection_id: z.string().uuid(),
  external_resource_id: z.string().min(1),
  provider_resource_id: z.string().nullable(),
  verification_token_hash: z.string().length(64),
});

function secureHashMatch(actual: string, expected: string): boolean {
  const left = Buffer.from(actual, "hex");
  const right = Buffer.from(expected, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const channelId = request.headers.get("x-goog-channel-id");
  const channelToken = request.headers.get("x-goog-channel-token");
  const resourceId = request.headers.get("x-goog-resource-id");
  const resourceState = request.headers.get("x-goog-resource-state");
  const messageNumber = request.headers.get("x-goog-message-number");
  if (!channelId || !channelToken || !resourceId || !resourceState || !messageNumber) {
    return NextResponse.json({ error: "invalid_notification" }, { status: 400 });
  }

  try {
    const db = createServiceClient();
    const { data, error } = await db
      .from("provider_subscriptions")
      .select("id, office_id, agent_id, connection_id, external_resource_id, provider_resource_id, verification_token_hash")
      .eq("provider", "google")
      .eq("resource_type", "calendar_events")
      .eq("provider_subscription_id", channelId)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw new Error(`Calendar subscription lookup failed: ${error.message}`);
    if (!data) return NextResponse.json({ error: "unknown_channel" }, { status: 404 });
    const subscription = SubscriptionSchema.parse(data);
    if (
      subscription.provider_resource_id !== resourceId
      || !secureHashMatch(hashGoogleChannelToken(channelToken), subscription.verification_token_hash)
    ) {
      return NextResponse.json({ error: "invalid_channel" }, { status: 401 });
    }

    const run = await tasks.trigger<typeof syncGoogleCalendar>(
      "sync-google-calendar",
      { connectionId: subscription.connection_id, calendarId: subscription.external_resource_id },
      {
        idempotencyKey: ["calendar-push", channelId, messageNumber],
        idempotencyKeyTTL: "7d",
        concurrencyKey: subscription.connection_id,
      }
    );
    await writeAudit(db, {
      officeId: subscription.office_id,
      actor: "system",
      agentId: subscription.agent_id,
      action: "google.calendar_notification_received",
      payload: { channelId, resourceState, messageNumber, triggerRunId: run.id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[google:calendar-webhook]", error);
    return NextResponse.json({ error: "notification_failed" }, { status: 503 });
  }
}
