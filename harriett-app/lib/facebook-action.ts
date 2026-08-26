import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { createServiceClient } from "@/lib/db/server";
import { deleteFacebookPagePost, decryptMetaTokens, publishFacebookPagePost } from "@/lib/integrations/meta";

export const FacebookPublishPayloadSchema = z.object({
  artifactId: z.string().uuid(),
  connectionId: z.string().uuid(),
  pageId: z.string().min(1),
  pageName: z.string().min(1),
  message: z.string().trim().min(1).max(63_206),
  link: z.string().url().nullable(),
  imageUrl: z.string().url().nullable().default(null),
}).superRefine((payload, context) => {
  if (payload.link && payload.imageUrl) {
    context.addIssue({ code: "custom", message: "a Facebook post cannot attach both a link preview and a photo" });
  }
});

export const FacebookDeletePayloadSchema = z.object({
  artifactId: z.string().uuid(),
  connectionId: z.string().uuid(),
  pageId: z.string().min(1),
  pageName: z.string().min(1),
  postId: z.string().min(1),
});

const MetaConnectionSecretSchema = z.object({
  token_ciphertext: z.string(),
  token_iv: z.string(),
  token_tag: z.string(),
});

function parseMetaConnectionSecret(value: unknown) {
  const parsed = z.union([
    MetaConnectionSecretSchema,
    z.array(MetaConnectionSecretSchema).min(1),
  ]).parse(value);
  return Array.isArray(parsed) ? parsed[0] : parsed;
}

export async function executeFacebookPublish(actionRequestId: string) {
  const db = createServiceClient();
  const id = z.string().uuid().parse(actionRequestId);
  const { data: action, error: actionError } = await db
    .from("action_requests")
    .select("id,office_id,agent_id,deal_id,skill_name,exact_payload,status")
    .eq("id", id)
    .single();
  if (actionError || !action) throw new Error("Facebook publish request was not found");
  if (action.skill_name !== "facebook_publish_post") throw new Error("action is not a Facebook publish request");
  if (action.status === "completed") return { alreadyCompleted: true };
  if (action.status !== "approved") throw new Error(`Facebook publish request is ${action.status}, not approved`);
  const payload = FacebookPublishPayloadSchema.parse(action.exact_payload);

  const startedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await db
    .from("action_requests")
    .update({ status: "running", execution_started_at: startedAt, execution_error: null, updated_at: startedAt })
    .eq("id", action.id)
    .eq("status", "approved")
    .select("id")
    .maybeSingle();
  if (claimError || !claimed) throw new Error("Facebook publish request was already claimed");

  let facebookPostId: string | null = null;
  let facebookPermalink: string | null = null;
  try {
    const { data: artifact, error: artifactError } = await db
      .from("artifacts")
      .select("id,content,status")
      .eq("id", payload.artifactId)
      .eq("office_id", action.office_id)
      .eq("agent_id", action.agent_id)
      .single();
    if (artifactError || !artifact) throw new Error("Facebook draft was not found");
    const existingContent = z.record(z.string(), z.unknown()).safeParse(artifact.content);
    const existingPostId = existingContent.success && typeof existingContent.data.external_post_id === "string"
      ? existingContent.data.external_post_id
      : null;
    if (existingPostId) {
      const completedAt = new Date().toISOString();
      const output = { postId: existingPostId, alreadyPublished: true };
      await db.from("action_requests").update({
        status: "completed",
        execution_output: output,
        executed_at: completedAt,
        updated_at: completedAt,
      }).eq("id", action.id).eq("status", "running");
      return output;
    }

    const { data: connection, error: connectionError } = await db
      .from("connections")
      .select("id,capabilities,connection_secrets(token_ciphertext,token_iv,token_tag)")
      .eq("id", payload.connectionId)
      .eq("office_id", action.office_id)
      .eq("agent_id", action.agent_id)
      .eq("provider", "meta")
      .eq("status", "connected")
      .single();
    if (connectionError || !connection) {
      throw new Error("connected Facebook account does not match the approved request");
    }
    const capabilities = z.record(z.string(), z.unknown()).parse(connection.capabilities);
    if (capabilities.selected_page_id !== payload.pageId) {
      throw new Error("selected Facebook Page changed after approval was requested");
    }
    const secret = parseMetaConnectionSecret(connection.connection_secrets);
    const tokens = decryptMetaTokens({
      tokenCiphertext: secret.token_ciphertext,
      tokenIv: secret.token_iv,
      tokenTag: secret.token_tag,
    });
    const page = tokens.pages.find((candidate) => candidate.id === payload.pageId);
    if (!page || page.name !== payload.pageName) throw new Error("approved Facebook Page is no longer available");

    const published = await publishFacebookPagePost({
      page,
      message: payload.message,
      link: payload.link ?? undefined,
      imageUrl: payload.imageUrl ?? undefined,
    });
    facebookPostId = published.postId;
    facebookPermalink = published.permalinkUrl;
    const completedAt = new Date().toISOString();
    const updatedContent = {
      ...(existingContent.success ? existingContent.data : {}),
      publish_status: "published",
      page_id: page.id,
      page_name: page.name,
      external_post_id: published.postId,
      external_permalink: published.permalinkUrl,
      image_url: payload.imageUrl,
      published_at: completedAt,
    };
    const { error: artifactUpdateError } = await db.from("artifacts").update({
      status: "published",
      plain_text: payload.message,
      content: updatedContent,
      updated_at: completedAt,
    }).eq("id", artifact.id).eq("agent_id", action.agent_id);
    if (artifactUpdateError) throw new Error(`published post could not be recorded: ${artifactUpdateError.message}`);

    const output = { postId: published.postId, permalinkUrl: published.permalinkUrl, artifactId: artifact.id };
    const { error: completionError } = await db.from("action_requests").update({
      status: "completed",
      execution_output: output,
      executed_at: completedAt,
      updated_at: completedAt,
    }).eq("id", action.id).eq("status", "running");
    if (completionError) throw new Error(`Facebook publish completion could not be recorded: ${completionError.message}`);
    await writeAudit(db, {
      officeId: action.office_id,
      actor: "system",
      agentId: action.agent_id,
      dealId: action.deal_id ?? undefined,
      action: "facebook.publish_completed",
      payload: { actionRequestId: action.id, ...output, pageId: page.id },
    });
    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 2_000) : "unknown Facebook publish failure";
    const failedAt = new Date().toISOString();
    await db.from("action_requests").update({
      status: "failed",
      execution_error: message,
      executed_at: failedAt,
      updated_at: failedAt,
    }).eq("id", action.id).eq("status", "running");
    const { data: failedArtifact } = await db.from("artifacts")
      .select("content")
      .eq("id", payload.artifactId)
      .eq("office_id", action.office_id)
      .eq("agent_id", action.agent_id)
      .maybeSingle();
    const failedContent = z.record(z.string(), z.unknown()).safeParse(failedArtifact?.content);
    await db.from("artifacts").update({
      status: facebookPostId ? "approved" : "draft",
      content: {
        ...(failedContent.success ? failedContent.data : {}),
        publish_status: facebookPostId ? "verification_needed" : "failed",
        publish_error: message,
        publish_failed_at: failedAt,
        ...(facebookPostId ? {
          external_post_id: facebookPostId,
          external_permalink: facebookPermalink,
        } : {}),
      },
      updated_at: failedAt,
    }).eq("id", payload.artifactId).eq("agent_id", action.agent_id);
    await writeAudit(db, {
      officeId: action.office_id,
      actor: "system",
      agentId: action.agent_id,
      dealId: action.deal_id ?? undefined,
      action: "facebook.publish_failed",
      payload: { actionRequestId: action.id, artifactId: payload.artifactId, error: message },
    });
    throw error;
  }
}

export async function executeFacebookDelete(actionRequestId: string) {
  const db = createServiceClient();
  const id = z.string().uuid().parse(actionRequestId);
  const { data: action, error: actionError } = await db
    .from("action_requests")
    .select("id,office_id,agent_id,deal_id,skill_name,exact_payload,status")
    .eq("id", id)
    .single();
  if (actionError || !action) throw new Error("Facebook deletion request was not found");
  if (action.skill_name !== "facebook_delete_post") throw new Error("action is not a Facebook deletion request");
  if (action.status === "completed") return { alreadyCompleted: true };
  if (action.status !== "approved") throw new Error(`Facebook deletion request is ${action.status}, not approved`);
  const payload = FacebookDeletePayloadSchema.parse(action.exact_payload);

  const startedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await db
    .from("action_requests")
    .update({ status: "running", execution_started_at: startedAt, execution_error: null, updated_at: startedAt })
    .eq("id", action.id)
    .eq("status", "approved")
    .select("id")
    .maybeSingle();
  if (claimError || !claimed) throw new Error("Facebook deletion request was already claimed");

  try {
    const { data: artifact, error: artifactError } = await db
      .from("artifacts")
      .select("id,content,status")
      .eq("id", payload.artifactId)
      .eq("office_id", action.office_id)
      .eq("agent_id", action.agent_id)
      .single();
    if (artifactError || !artifact) throw new Error("published Facebook post was not found");
    const content = z.record(z.string(), z.unknown()).parse(artifact.content);
    if (content.publish_status === "deleted" || artifact.status === "archived") {
      const completedAt = new Date().toISOString();
      const output = { postId: payload.postId, alreadyDeleted: true, artifactId: artifact.id };
      await db.from("action_requests").update({
        status: "completed",
        execution_output: output,
        executed_at: completedAt,
        updated_at: completedAt,
      }).eq("id", action.id).eq("status", "running");
      return output;
    }
    if (content.external_post_id !== payload.postId || content.page_id !== payload.pageId) {
      throw new Error("published Facebook post changed after deletion was requested");
    }

    const { data: connection, error: connectionError } = await db
      .from("connections")
      .select("id,connection_secrets(token_ciphertext,token_iv,token_tag)")
      .eq("id", payload.connectionId)
      .eq("office_id", action.office_id)
      .eq("agent_id", action.agent_id)
      .eq("provider", "meta")
      .eq("status", "connected")
      .single();
    if (connectionError || !connection) throw new Error("connected Facebook account does not match the deletion request");
    const secret = parseMetaConnectionSecret(connection.connection_secrets);
    const tokens = decryptMetaTokens({
      tokenCiphertext: secret.token_ciphertext,
      tokenIv: secret.token_iv,
      tokenTag: secret.token_tag,
    });
    const page = tokens.pages.find((candidate) => candidate.id === payload.pageId);
    if (!page || page.name !== payload.pageName) throw new Error("approved Facebook Page is no longer available");

    await deleteFacebookPagePost({ page, postId: payload.postId });
    const completedAt = new Date().toISOString();
    const updatedContent = {
      ...content,
      publish_status: "deleted",
      deleted_at: completedAt,
      deleted_external_permalink: content.external_permalink ?? null,
      external_permalink: null,
    };
    const { error: artifactUpdateError } = await db.from("artifacts").update({
      status: "archived",
      content: updatedContent,
      updated_at: completedAt,
    }).eq("id", artifact.id).eq("agent_id", action.agent_id);
    if (artifactUpdateError) throw new Error(`deleted post could not be archived: ${artifactUpdateError.message}`);

    const output = { postId: payload.postId, deleted: true, artifactId: artifact.id };
    const { error: completionError } = await db.from("action_requests").update({
      status: "completed",
      execution_output: output,
      executed_at: completedAt,
      updated_at: completedAt,
    }).eq("id", action.id).eq("status", "running");
    if (completionError) throw new Error(`Facebook deletion completion could not be recorded: ${completionError.message}`);
    await writeAudit(db, {
      officeId: action.office_id,
      actor: "system",
      agentId: action.agent_id,
      dealId: action.deal_id ?? undefined,
      action: "facebook.delete_completed",
      payload: { actionRequestId: action.id, ...output, pageId: page.id },
    });
    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 2_000) : "unknown Facebook deletion failure";
    const failedAt = new Date().toISOString();
    await db.from("action_requests").update({
      status: "failed",
      execution_error: message,
      executed_at: failedAt,
      updated_at: failedAt,
    }).eq("id", action.id).eq("status", "running");
    await writeAudit(db, {
      officeId: action.office_id,
      actor: "system",
      agentId: action.agent_id,
      dealId: action.deal_id ?? undefined,
      action: "facebook.delete_failed",
      payload: { actionRequestId: action.id, artifactId: payload.artifactId, postId: payload.postId, error: message },
    });
    throw error;
  }
}
