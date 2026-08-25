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
    return NextResponse.redirect(new URL(`/approvals?decision=${decision.data.decision === "approve" ? "approved" : "rejected"}`, request.url), 303);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "approval failed" }, { status: 409 });
  }
}
