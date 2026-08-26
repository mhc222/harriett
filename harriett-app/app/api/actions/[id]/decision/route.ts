import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";
import { decideGoogleAction } from "@/lib/google-action-approval";

const DecisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(1_000).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actionId = z.string().uuid().safeParse((await params).id);
  if (!actionId.success) return NextResponse.json({ error: "invalid action id" }, { status: 400 });
  const form = await request.formData();
  const decision = DecisionSchema.safeParse({
    decision: form.get("decision"),
    reason: typeof form.get("reason") === "string" ? form.get("reason") : undefined,
  });
  if (!decision.success) return NextResponse.json({ error: "invalid approval decision" }, { status: 400 });

  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.redirect(new URL("/login?next=%2Fapprovals", request.url), 303);
  const { data: targetAction } = await db
    .from("action_requests")
    .select("skill_name,exact_payload")
    .eq("id", actionId.data)
    .eq("office_id", auth.officeId)
    .maybeSingle();
  try {
    await decideGoogleAction({
      db,
      officeId: auth.officeId,
      actorAgentId: auth.agentId,
      actorUserId: auth.user.id,
      actorRole: auth.role,
      actionRequestId: actionId.data,
      decision: decision.data.decision,
      reason: decision.data.reason,
    });
    if (targetAction?.skill_name === "facebook_publish_post") {
      const exactPayload = z.object({ artifactId: z.string().uuid() }).safeParse(targetAction.exact_payload);
      const draft = exactPayload.success ? `&draft=${encodeURIComponent(exactPayload.data.artifactId)}` : "";
      const outcome = decision.data.decision === "approve" ? "published=1" : "rejected=1";
      return NextResponse.redirect(new URL(`/social?${outcome}${draft}`, request.url), 303);
    }
    return NextResponse.redirect(new URL(`/approvals?decision=${decision.data.decision === "approve" ? "approved" : "rejected"}`, request.url), 303);
  } catch (error) {
    if (targetAction?.skill_name === "facebook_publish_post") {
      const message = error instanceof Error ? error.message : "Facebook publishing failed";
      return NextResponse.redirect(new URL(`/social?error=${encodeURIComponent(message)}`, request.url), 303);
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "approval failed" }, { status: 409 });
  }
}
