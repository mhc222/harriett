import { createHash, randomUUID } from "node:crypto";
import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { authenticatedContext } from "@/lib/auth-context";
import { loadMetaConnection } from "@/lib/connections/meta";
import { createUserClient } from "@/lib/db/server";
import type { executeFacebookAction } from "@/trigger/facebook-actions";

const PublishInputSchema = z.object({
  artifactId: z.string().uuid(),
  message: z.string().trim().min(1).max(63_206),
  link: z.union([z.literal(""), z.string().url()]).optional(),
});

const ArtifactPublishContentSchema = z.object({
  share_mode: z.enum(["link_preview", "listing_photo", "text_only"]).optional(),
  public_listing_url: z.string().url().nullable().optional(),
  primary_image_url: z.string().url().nullable().optional(),
}).passthrough();

export async function POST(request: Request) {
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;
  const form = await request.formData();
  const parsed = PublishInputSchema.safeParse({
    artifactId: form.get("artifactId"),
    message: form.get("message"),
    link: typeof form.get("link") === "string" ? form.get("link") : undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "invalid Facebook post" }, { status: 400 });
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.redirect(new URL("/login?next=%2Fsocial", request.url), 303);

  const [{ data: artifact, error: artifactError }, connection] = await Promise.all([
    db.from("artifacts").select("id,title,deal_id,content,status").eq("id", parsed.data.artifactId).eq("agent_id", auth.agentId).single(),
    loadMetaConnection(db),
  ]);
  if (artifactError || !artifact) return NextResponse.json({ error: "social draft was not found" }, { status: 404 });
  if (!connection?.selectedPageId) return NextResponse.redirect(new URL("/connections?meta=choose_page", request.url), 303);
  const page = connection.tokens.pages.find((candidate) => candidate.id === connection.selectedPageId);
  if (!page) return NextResponse.redirect(new URL("/connections?meta=choose_page", request.url), 303);

  const content = ArtifactPublishContentSchema.safeParse(artifact.content);
  const shareMode = content.success ? content.data.share_mode : undefined;
  const officialListingUrl = content.success ? content.data.public_listing_url ?? null : null;
  const imageUrl = shareMode === "listing_photo"
    ? content.success ? content.data.primary_image_url ?? null : null
    : null;
  if (shareMode === "listing_photo" && (!imageUrl || !officialListingUrl)) {
    return NextResponse.json({ error: "verified listing photo metadata is missing" }, { status: 409 });
  }
  if (shareMode === "listing_photo" && officialListingUrl && !parsed.data.message.includes(officialListingUrl)) {
    return NextResponse.json({ error: "the reviewed photo caption must include the official listing URL" }, { status: 400 });
  }
  const link = shareMode === "link_preview"
    ? officialListingUrl
    : shareMode === "listing_photo" || shareMode === "text_only"
      ? null
      : parsed.data.link || null;
  const updatedContent = {
    ...(content.success ? content.data : {}),
    link,
    image_url: imageUrl,
    page_id: page.id,
    page_name: page.name,
    connection_id: connection.connectionId,
    publish_status: "publishing",
  };
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ pageId: page.id, message: parsed.data.message, link, imageUrl }))
    .digest("hex")
    .slice(0, 24);
  const idempotencyKey = `facebook-publish-v2:${artifact.id}:${fingerprint}`;
  const exactPayload = {
    artifactId: artifact.id,
    connectionId: connection.connectionId,
    pageId: page.id,
    pageName: page.name,
    message: parsed.data.message,
    link,
    imageUrl,
  };
  const actionValues = {
    office_id: auth.officeId,
    agent_id: auth.agentId,
    deal_id: artifact.deal_id,
    skill_name: "facebook_publish_post",
    exact_payload: exactPayload,
    summary: `Publish ${artifact.title} to ${page.name}`,
    recipient_kind: "agent",
    status: "approved",
    required_approver: "agent",
    approved_by: auth.agentId,
    approved_at: new Date().toISOString(),
    idempotency_key: idempotencyKey,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const { data: insertedAction, error: actionError } = await db.from("action_requests")
    .insert(actionValues)
    .select("id,status")
    .maybeSingle();
  let action = insertedAction;
  if (actionError) {
    const { data: existing } = await db.from("action_requests")
      .select("id,status")
      .eq("idempotency_key", idempotencyKey)
      .eq("agent_id", auth.agentId)
      .maybeSingle();
    action = existing;
  }
  if (action && ["failed", "cancelled"].includes(action.status)) {
    const { data: retryAction, error: retryError } = await db.from("action_requests")
      .insert({
        ...actionValues,
        idempotency_key: `${idempotencyKey}:retry:${randomUUID()}`,
      })
      .select("id,status")
      .single();
    if (retryError) {
      return NextResponse.json({ error: "Facebook publishing retry could not be created" }, { status: 500 });
    }
    action = retryAction;
  }
  if (!action) return NextResponse.json({ error: actionError?.message ?? "publish approval could not be created" }, { status: 500 });
  if (action.status === "completed") {
    if (wantsJson) return NextResponse.json({ ok: true, status: "published", artifactId: artifact.id });
    return NextResponse.redirect(new URL(`/social?published=1&draft=${encodeURIComponent(artifact.id)}`, request.url), 303);
  }

  const { error: updateError } = await db.from("artifacts").update({
    plain_text: parsed.data.message,
    content: updatedContent,
    status: "approved",
    updated_at: new Date().toISOString(),
  }).eq("id", artifact.id).eq("agent_id", auth.agentId);
  if (updateError) return NextResponse.json({ error: "social draft could not be updated" }, { status: 500 });

  const run = await tasks.trigger<typeof executeFacebookAction>(
    "execute-facebook-action",
    { actionRequestId: action.id, action: "publish" },
    { idempotencyKey: ["facebook-publish", action.id], idempotencyKeyTTL: "30d" },
  );

  await writeAudit(db, {
    officeId: auth.officeId,
    actor: "user",
    actorId: auth.user.id,
    agentId: auth.agentId,
    dealId: artifact.deal_id ?? undefined,
    action: "facebook.publish_approved",
    payload: {
      actionRequestId: action.id,
      artifactId: artifact.id,
      pageId: page.id,
      pageName: page.name,
      shareMode: shareMode ?? "legacy",
      publicListingUrl: officialListingUrl,
      imageIncluded: Boolean(imageUrl),
      runId: run.id,
    },
  });
  if (wantsJson) {
    return NextResponse.json({ ok: true, status: "publishing", artifactId: artifact.id, actionRequestId: action.id });
  }
  return NextResponse.redirect(new URL(`/social?posting=1&draft=${encodeURIComponent(artifact.id)}`, request.url), 303);
}
