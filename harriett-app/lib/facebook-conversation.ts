import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { createFacebookDraft, SocialPostTypeSchema } from "@/lib/social-drafts";

type SocialPostType = z.infer<typeof SocialPostTypeSchema>;

const DraftContentSchema = z.object({
  provider: z.literal("facebook"),
  share_mode: z.enum(["link_preview", "listing_photo", "text_only"]),
  public_listing_url: z.string().url().nullable().optional(),
  primary_image_url: z.string().url().nullable().optional(),
  external_permalink: z.string().url().nullable().optional(),
}).passthrough();

const ConnectionCapabilitiesSchema = z.object({
  selected_page_id: z.string().min(1),
  pages: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
  })).default([]),
}).passthrough();

export interface ConversationalFacebookApproval {
  actionRequestId: string;
  artifactId: string;
  title: string;
  pageName: string;
  status: string;
  existingPermalink: string | null;
}

function normalizedWords(value: string): string[] {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2 || /^\d+$/.test(word));
}

function postTypeForRequest(message: string, status: string): SocialPostType {
  if (/\bopen house\b/i.test(message)) return "open_house";
  if (/\b(?:under contract|pending)\b/i.test(message)) return "under_contract";
  if (/\b(?:just sold|sold|closed)\b/i.test(message)) return "just_sold";
  if (/\bmarket update\b/i.test(message)) return "market_update";
  if (/\bnew listing\b/i.test(message)) return "new_listing";
  if (status === "closed") return "just_sold";
  if (status === "under_contract") return "under_contract";
  return "new_listing";
}

export async function createFacebookDraftFromConversation(input: {
  db: SupabaseClient;
  officeId: string;
  agentId: string;
  message: string;
}) {
  const { data: deals, error } = await input.db
    .from("deals")
    .select("id,address,city,status,updated_at")
    .eq("office_id", input.officeId)
    .eq("agent_id", input.agentId)
    .not("status", "in", "(cancelled)")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`Facebook transaction lookup failed: ${error.message}`);
  if (!deals?.length) throw new Error("I could not find an active transaction for this Facebook post.");

  const messageWords = new Set(normalizedWords(input.message));
  const scored = deals.map((deal) => {
    const addressWords = normalizedWords(`${deal.address} ${deal.city ?? ""}`);
    const score = addressWords.reduce((total, word) => total + (messageWords.has(word) ? (/^\d+$/.test(word) ? 4 : 1) : 0), 0);
    return { deal, score };
  }).sort((left, right) => right.score - left.score);
  const best = scored[0];
  const second = scored[1];
  const explicitMatch = best && best.score >= 2 && (!second || best.score > second.score);
  const latestListing = /\b(?:latest|new|active) listing\b/i.test(input.message)
    ? deals.find((deal) => deal.status === "listing_active")
    : null;
  const selected = explicitMatch ? best.deal : latestListing ?? (deals.length === 1 ? deals[0] : null);
  if (!selected) {
    const choices = deals.slice(0, 3).map((deal) => deal.address).join(", ");
    throw new Error(`I found more than one possible transaction. Tell me which property you mean: ${choices}.`);
  }

  return createFacebookDraft({
    db: input.db,
    officeId: input.officeId,
    agentId: input.agentId,
    actor: "harriett",
    proposalSource: "whatsapp_request",
    postType: postTypeForRequest(input.message, selected.status),
    shareMode: "link_preview",
    dealId: selected.id,
  });
}

export async function approveLatestFacebookDraftFromConversation(input: {
  db: SupabaseClient;
  officeId: string;
  agentId: string;
}): Promise<ConversationalFacebookApproval> {
  const { data: artifact, error: artifactError } = await input.db
    .from("artifacts")
    .select("id,deal_id,title,plain_text,content,status")
    .eq("office_id", input.officeId)
    .eq("agent_id", input.agentId)
    .eq("kind", "social_post")
    .in("status", ["draft", "ready_for_review", "approved"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (artifactError) throw new Error(`Facebook draft lookup failed: ${artifactError.message}`);
  if (!artifact?.plain_text) {
    throw new Error("I could not find a pending Facebook draft. Ask me to make one first.");
  }

  const content = DraftContentSchema.safeParse(artifact.content);
  if (!content.success) throw new Error("The latest Facebook draft is missing its verified publishing details.");
  const message = artifact.plain_text.replace(/\s*—\s*/g, " - ");
  const title = artifact.title.replace(/\s*—\s*/g, " - ");

  const { data: connection, error: connectionError } = await input.db
    .from("connections")
    .select("id,capabilities")
    .eq("office_id", input.officeId)
    .eq("agent_id", input.agentId)
    .eq("provider", "meta")
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (connectionError) throw new Error(`Facebook connection lookup failed: ${connectionError.message}`);
  if (!connection) throw new Error("Facebook is not connected. Connect a Page in Harriett, then try again.");

  const capabilities = ConnectionCapabilitiesSchema.safeParse(connection.capabilities);
  if (!capabilities.success) throw new Error("Choose a Facebook Page in Harriett, then try again.");
  const page = capabilities.data.pages.find((candidate) => candidate.id === capabilities.data.selected_page_id);
  if (!page) throw new Error("The selected Facebook Page is no longer available. Reconnect it, then try again.");

  const officialListingUrl = content.data.public_listing_url ?? null;
  const imageUrl = content.data.share_mode === "listing_photo"
    ? content.data.primary_image_url ?? null
    : null;
  if (content.data.share_mode === "listing_photo" && (!imageUrl || !officialListingUrl)) {
    throw new Error("The draft is missing its verified listing photo or official listing link.");
  }
  if (
    content.data.share_mode === "listing_photo"
    && officialListingUrl
    && !message.includes(officialListingUrl)
  ) {
    throw new Error("The listing-photo caption must include the official listing link before it can be posted.");
  }
  const link = content.data.share_mode === "link_preview" ? officialListingUrl : null;
  const exactPayload = {
    artifactId: artifact.id,
    connectionId: connection.id,
    pageId: page.id,
    pageName: page.name,
    message,
    link,
    imageUrl,
  };
  const fingerprint = crypto
    .createHash("sha256")
    .update(JSON.stringify({ pageId: page.id, message, link, imageUrl }))
    .digest("hex")
    .slice(0, 24);
  const idempotencyKey = `facebook-publish-v2:${artifact.id}:${fingerprint}`;
  const now = new Date().toISOString();
  const actionValues = {
    office_id: input.officeId,
    agent_id: input.agentId,
    deal_id: artifact.deal_id,
    skill_name: "facebook_publish_post",
    exact_payload: exactPayload,
    summary: `Publish ${title} to ${page.name}`,
    recipient_kind: "agent",
    status: "approved",
    required_approver: "agent",
    approved_by: input.agentId,
    approved_at: now,
    idempotency_key: idempotencyKey,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000).toISOString(),
  };

  const { data: inserted, error: insertError } = await input.db
    .from("action_requests")
    .insert(actionValues)
    .select("id,status")
    .maybeSingle();
  let action = inserted;
  if (insertError) {
    const { data: existing, error: existingError } = await input.db
      .from("action_requests")
      .select("id,status")
      .eq("idempotency_key", idempotencyKey)
      .eq("agent_id", input.agentId)
      .maybeSingle();
    if (existingError) throw new Error(`Facebook approval lookup failed: ${existingError.message}`);
    action = existing;
  }
  if (!action) throw new Error("The Facebook publishing approval could not be saved.");

  if (action.status === "proposed") {
    const { data: approved, error: approvalError } = await input.db
      .from("action_requests")
      .update({ status: "approved", approved_by: input.agentId, approved_at: now, updated_at: now })
      .eq("id", action.id)
      .eq("agent_id", input.agentId)
      .eq("status", "proposed")
      .select("id,status")
      .single();
    if (approvalError) throw new Error(`Facebook approval failed: ${approvalError.message}`);
    action = approved;
  }
  if (["failed", "cancelled"].includes(action.status)) {
    const { data: retry, error: retryError } = await input.db
      .from("action_requests")
      .insert({
        ...actionValues,
        idempotency_key: `${idempotencyKey}:retry:${crypto.randomUUID()}`,
      })
      .select("id,status")
      .single();
    if (retryError) throw new Error(`Facebook publishing retry could not be created: ${retryError.message}`);
    action = retry;
  }

  if (action.status !== "completed") {
    const { error: updateError } = await input.db.from("artifacts").update({
      title,
      plain_text: message,
      content: {
        ...content.data,
        link,
        image_url: imageUrl,
        page_id: page.id,
        page_name: page.name,
        connection_id: connection.id,
        publish_status: "publishing",
      },
      status: "approved",
      updated_at: now,
    }).eq("id", artifact.id).eq("agent_id", input.agentId);
    if (updateError) throw new Error(`Facebook draft could not be approved: ${updateError.message}`);
  }

  await writeAudit(input.db, {
    officeId: input.officeId,
    actor: "user",
    agentId: input.agentId,
    dealId: artifact.deal_id ?? undefined,
    action: "facebook.publish_approved_by_message",
    payload: {
      actionRequestId: action.id,
      artifactId: artifact.id,
      pageId: page.id,
      pageName: page.name,
      approvalPhrase: "explicit_agent_message",
    },
  });

  return {
    actionRequestId: action.id,
    artifactId: artifact.id,
    title,
    pageName: page.name,
    status: action.status,
    existingPermalink: content.data.external_permalink ?? null,
  };
}
