import { tasks } from "@trigger.dev/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";
import { googleMonitoringConfigured } from "@/lib/integrations/google";
import type { configureGoogleMonitoring } from "@/trigger/google-monitoring";

export async function POST(request: NextRequest) {
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.redirect(new URL("/login?next=%2Fconnections", request.url), 303);
  if (!googleMonitoringConfigured()) {
    return NextResponse.redirect(new URL("/connections?google=monitoring_not_configured", request.url), 303);
  }
  const { data, error } = await db
    .from("connections")
    .select("id")
    .eq("provider", "google")
    .eq("status", "connected")
    .eq("agent_id", auth.agentId)
    .single();
  if (error || !data) {
    return NextResponse.redirect(new URL("/connections?google=not_connected", request.url), 303);
  }
  const connectionId = z.string().uuid().parse(data.id);
  const run = await tasks.trigger<typeof configureGoogleMonitoring>(
    "configure-google-monitoring",
    { connectionId },
    { idempotencyKey: ["google-monitoring-manual", connectionId, Date.now().toString()], idempotencyKeyTTL: "1h" }
  );
  await writeAudit(db, {
    officeId: auth.officeId,
    actor: "user",
    actorId: auth.user.id,
    agentId: auth.agentId,
    action: "google.monitoring_requested",
    payload: { connectionId, triggerRunId: run.id },
  });
  return NextResponse.redirect(new URL("/connections?google=monitoring_queued", request.url), 303);
}
