import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";

const DeleteDraftInputSchema = z.object({ artifactId: z.string().uuid() });
const ArtifactContentSchema = z.record(z.string(), z.unknown());

export async function POST(request: Request) {
  const form = await request.formData();
  const input = DeleteDraftInputSchema.safeParse({ artifactId: form.get("artifactId") });
  if (!input.success) return NextResponse.json({ error: "invalid Facebook draft" }, { status: 400 });

  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.redirect(new URL("/login?next=%2Fsocial", request.url), 303);

  const { data: artifact, error: artifactError } = await db.from("artifacts")
    .select("id,deal_id,status,content")
    .eq("id", input.data.artifactId)
    .eq("agent_id", auth.agentId)
    .eq("kind", "social_post")
    .single();
  if (artifactError || !artifact) {
    return NextResponse.json({ error: "Facebook draft was not found" }, { status: 404 });
  }

  const content = ArtifactContentSchema.safeParse(artifact.content);
  const publishStatus = content.success && typeof content.data.publish_status === "string"
    ? content.data.publish_status
    : artifact.status;
  const externalPostId = content.success && typeof content.data.external_post_id === "string"
    ? content.data.external_post_id
    : null;
  if (artifact.status === "published" || publishStatus === "published" || externalPostId) {
    return NextResponse.redirect(new URL(`/social?view=history&error=${encodeURIComponent("Use Delete from Facebook for a published post")}`, request.url), 303);
  }
  if (publishStatus === "deleting") {
    return NextResponse.redirect(new URL(`/social?view=history&error=${encodeURIComponent("Facebook deletion is already in progress")}`, request.url), 303);
  }

  const { data: latestAction } = await db.from("action_requests")
    .select("status")
    .eq("agent_id", auth.agentId)
    .eq("skill_name", "facebook_publish_post")
    .contains("exact_payload", { artifactId: artifact.id })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestAction && ["approved", "running"].includes(latestAction.status)) {
    return NextResponse.redirect(new URL(`/social?view=history&error=${encodeURIComponent("Wait for Facebook publishing to finish before deleting this draft")}`, request.url), 303);
  }
  if (latestAction?.status === "completed") {
    return NextResponse.redirect(new URL(`/social?view=history&error=${encodeURIComponent("Publishing completed. Refresh and delete the post from Facebook")}`, request.url), 303);
  }

  const discardedAt = new Date().toISOString();
  const { error: updateError } = await db.from("artifacts").update({
    status: "archived",
    content: {
      ...(content.success ? content.data : {}),
      publish_status: "discarded",
      discarded_at: discardedAt,
      discarded_by: auth.agentId,
    },
    updated_at: discardedAt,
  }).eq("id", artifact.id).eq("agent_id", auth.agentId);
  if (updateError) return NextResponse.json({ error: "Facebook draft could not be deleted" }, { status: 500 });

  await writeAudit(db, {
    officeId: auth.officeId,
    actor: "user",
    actorId: auth.user.id,
    agentId: auth.agentId,
    dealId: artifact.deal_id ?? undefined,
    action: "artifact.facebook_draft_discarded",
    payload: { artifactId: artifact.id, previousPublishStatus: publishStatus },
  });
  return NextResponse.redirect(new URL("/social?view=history&removed=1", request.url), 303);
}
