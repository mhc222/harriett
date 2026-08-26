import { createHash } from "node:crypto";
import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { authenticatedContext } from "@/lib/auth-context";
import { loadMetaConnection } from "@/lib/connections/meta";
import { createUserClient } from "@/lib/db/server";
import type { executeFacebookAction } from "@/trigger/facebook-actions";

const DeleteInputSchema = z.object({ artifactId: z.string().uuid() });
const PublishedContentSchema = z.object({
  publish_status: z.literal("published"),
  external_post_id: z.string().min(1),
  page_id: z.string().min(1),
  page_name: z.string().min(1),
}).passthrough();

export async function POST(request: Request) {
  const form = await request.formData();
  const input = DeleteInputSchema.safeParse({ artifactId: form.get("artifactId") });
  if (!input.success) return NextResponse.json({ error: "invalid Facebook deletion" }, { status: 400 });
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.redirect(new URL("/login?next=%2Fsocial", request.url), 303);

  const [{ data: artifact, error: artifactError }, connection] = await Promise.all([
    db.from("artifacts")
      .select("id,title,deal_id,status,content")
      .eq("id", input.data.artifactId)
      .eq("agent_id", auth.agentId)
      .single(),
    loadMetaConnection(db),
  ]);
  if (artifactError || !artifact) return NextResponse.json({ error: "published Facebook post was not found" }, { status: 404 });
  const content = PublishedContentSchema.safeParse(artifact.content);
  if (!content.success || artifact.status !== "published") {
    return NextResponse.redirect(new URL(`/social?error=${encodeURIComponent("Only a published Facebook post can be deleted")}`, request.url), 303);
  }
  if (!connection) return NextResponse.redirect(new URL("/connections?meta=connect", request.url), 303);
  const page = connection.tokens.pages.find((candidate) => candidate.id === content.data.page_id);
  if (!page || page.name !== content.data.page_name) {
    return NextResponse.redirect(new URL(`/social?error=${encodeURIComponent("Reconnect the Facebook Page that published this post before deleting it")}`, request.url), 303);
  }

  const idempotencyKey = `facebook-delete:${artifact.id}:${createHash("sha256").update(content.data.external_post_id).digest("hex").slice(0, 24)}`;
  const exactPayload = {
    artifactId: artifact.id,
    connectionId: connection.connectionId,
    pageId: page.id,
    pageName: page.name,
    postId: content.data.external_post_id,
  };
  const { data: action, error: actionError } = await db.from("action_requests").insert({
    office_id: auth.officeId,
    agent_id: auth.agentId,
    deal_id: artifact.deal_id,
    skill_name: "facebook_delete_post",
    exact_payload: exactPayload,
    summary: `Delete ${artifact.title} from ${page.name}`,
    recipient_kind: "agent",
    status: "approved",
    required_approver: "agent",
    approved_by: auth.agentId,
    approved_at: new Date().toISOString(),
    idempotency_key: idempotencyKey,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }).select("id,status").maybeSingle();
  if (actionError || !action) {
    const { data: existing } = await db.from("action_requests")
      .select("id,status")
      .eq("idempotency_key", idempotencyKey)
      .eq("agent_id", auth.agentId)
      .maybeSingle();
    if (existing?.status === "completed") {
      return NextResponse.redirect(new URL(`/social?deleted=1&draft=${encodeURIComponent(artifact.id)}`, request.url), 303);
    }
    return NextResponse.redirect(new URL(`/social?error=${encodeURIComponent(actionError?.message ?? "Facebook deletion could not be approved")}`, request.url), 303);
  }

  const { error: artifactUpdateError } = await db.from("artifacts").update({
    content: { ...content.data, publish_status: "deleting" },
    updated_at: new Date().toISOString(),
  }).eq("id", artifact.id).eq("agent_id", auth.agentId);
  if (artifactUpdateError) return NextResponse.json({ error: "Facebook deletion state could not be saved" }, { status: 500 });

  const run = await tasks.trigger<typeof executeFacebookAction>(
    "execute-facebook-action",
    { actionRequestId: action.id, action: "delete" },
    { idempotencyKey: ["facebook-delete", action.id], idempotencyKeyTTL: "30d" },
  );
  await writeAudit(db, {
    officeId: auth.officeId,
    actor: "user",
    actorId: auth.user.id,
    agentId: auth.agentId,
    dealId: artifact.deal_id ?? undefined,
    action: "facebook.delete_approved",
    payload: { actionRequestId: action.id, artifactId: artifact.id, pageId: page.id, postId: content.data.external_post_id, runId: run.id },
  });
  return NextResponse.redirect(new URL(`/social?deleting=1&draft=${encodeURIComponent(artifact.id)}`, request.url), 303);
}
