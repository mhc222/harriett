import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { PublicListingMetadataSchema } from "@/lib/integrations/pritchett-moore";

const ConversationContextRowSchema = z.object({
  id: z.string().uuid(),
  office_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  thread_id: z.string().uuid(),
  active_deal_id: z.string().uuid().nullable(),
  active_artifact_id: z.string().uuid().nullable(),
  pending_action_id: z.string().uuid().nullable(),
  active_workflow_run_id: z.string().uuid().nullable(),
  context_version: z.coerce.number().int().positive(),
  expires_at: z.string().nullable(),
  updated_at: z.string(),
});

export type ConversationContextRow = z.infer<typeof ConversationContextRowSchema>;

export interface ConversationFocusPatch {
  activeDealId?: string | null;
  activeArtifactId?: string | null;
  pendingActionId?: string | null;
  activeWorkflowRunId?: string | null;
  expiresAt?: string | null;
}

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "")
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
}

export async function loadConversationContext(
  db: SupabaseClient,
  input: { officeId: string; agentId: string; threadId?: string },
): Promise<ConversationContextRow | null> {
  const columns = "id,office_id,agent_id,thread_id,active_deal_id,active_artifact_id,pending_action_id,active_workflow_run_id,context_version,expires_at,updated_at";
  if (input.threadId) {
    const exact = await db
      .from("conversation_contexts")
      .select(columns)
      .eq("office_id", input.officeId)
      .eq("agent_id", input.agentId)
      .eq("thread_id", input.threadId)
      .maybeSingle();
    if (exact.error) throw new Error(`conversation context lookup failed: ${exact.error.message}`);
    if (exact.data) {
      const parsed = ConversationContextRowSchema.parse(exact.data);
      if (!parsed.expires_at || new Date(parsed.expires_at).getTime() > Date.now()) return parsed;
    }
  }

  const recent = await db
    .from("conversation_contexts")
    .select(columns)
    .eq("office_id", input.officeId)
    .eq("agent_id", input.agentId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent.error) throw new Error(`recent conversation context lookup failed: ${recent.error.message}`);
  return recent.data ? ConversationContextRowSchema.parse(recent.data) : null;
}

export async function focusConversationContext(
  db: SupabaseClient,
  input: {
    officeId: string;
    agentId: string;
    threadId?: string;
    patch: ConversationFocusPatch;
  },
): Promise<void> {
  if (!input.threadId) return;
  const existing = await loadConversationContext(db, {
    officeId: input.officeId,
    agentId: input.agentId,
    threadId: input.threadId,
  });
  const changes = {
    ...(input.patch.activeDealId !== undefined ? { active_deal_id: input.patch.activeDealId } : {}),
    ...(input.patch.activeArtifactId !== undefined ? { active_artifact_id: input.patch.activeArtifactId } : {}),
    ...(input.patch.pendingActionId !== undefined ? { pending_action_id: input.patch.pendingActionId } : {}),
    ...(input.patch.activeWorkflowRunId !== undefined ? { active_workflow_run_id: input.patch.activeWorkflowRunId } : {}),
    ...(input.patch.expiresAt !== undefined ? { expires_at: input.patch.expiresAt } : {}),
    updated_at: new Date().toISOString(),
  };

  if (!existing || existing.thread_id !== input.threadId) {
    const inserted = await db.from("conversation_contexts").insert({
      office_id: input.officeId,
      agent_id: input.agentId,
      thread_id: input.threadId,
      active_deal_id: existing?.active_deal_id ?? null,
      active_artifact_id: existing?.active_artifact_id ?? null,
      pending_action_id: existing?.pending_action_id ?? null,
      expires_at: existing?.expires_at ?? null,
      ...changes,
    });
    if (inserted.error?.code === "23505") {
      return focusConversationContext(db, input);
    }
    if (inserted.error) throw new Error(`conversation context insert failed: ${inserted.error.message}`);
    return;
  }

  const updated = await db
    .from("conversation_contexts")
    .update({ ...changes, context_version: existing.context_version + 1 })
    .eq("id", existing.id)
    .eq("context_version", existing.context_version)
    .select("id")
    .maybeSingle();
  if (updated.error) throw new Error(`conversation context update failed: ${updated.error.message}`);
  if (!updated.data) return focusConversationContext(db, input);
}

function artifactLinks(content: unknown, artifactId: string | null) {
  const parsed = z.record(z.string(), z.unknown()).safeParse(content);
  const data = parsed.success ? parsed.data : {};
  const publicListingUrl = typeof data.public_listing_url === "string" ? data.public_listing_url : null;
  const liveFacebookUrl = typeof data.external_permalink === "string" ? data.external_permalink : null;
  return {
    privateReviewUrl: artifactId ? `${appBaseUrl()}/social?draft=${artifactId}` : null,
    publicListingUrl,
    liveFacebookUrl,
  };
}

export async function renderConversationContextCard(
  db: SupabaseClient,
  input: { officeId: string; agentId: string; threadId?: string },
): Promise<string> {
  const context = await loadConversationContext(db, input);
  if (!context) return "No active conversational focus is recorded.";

  const [dealResult, artifactResult, actionResult, workflowResult] = await Promise.all([
    context.active_deal_id
      ? db.from("deals")
        .select("id,address,city,status,properties(facts)")
        .eq("office_id", input.officeId)
        .eq("agent_id", input.agentId)
        .eq("id", context.active_deal_id)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    context.active_artifact_id
      ? db.from("artifacts")
        .select("id,title,status,version,content,updated_at")
        .eq("office_id", input.officeId)
        .eq("agent_id", input.agentId)
        .eq("id", context.active_artifact_id)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    context.pending_action_id
      ? db.from("action_requests")
        .select("id,skill_name,summary,status,expires_at")
        .eq("office_id", input.officeId)
        .eq("agent_id", input.agentId)
        .eq("id", context.pending_action_id)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    context.active_workflow_run_id
      ? db.from("workflow_runs")
        .select("id,workflow,status")
        .eq("office_id", input.officeId)
        .eq("agent_id", input.agentId)
        .eq("id", context.active_workflow_run_id)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  for (const result of [dealResult, artifactResult, actionResult, workflowResult]) {
    if (result.error) throw new Error(`conversation context detail failed: ${result.error.message}`);
  }

  const deal = dealResult.data;
  const artifact = artifactResult.data;
  const action = actionResult.data;
  const workflow = workflowResult.data;
  const property = deal && (Array.isArray(deal.properties) ? deal.properties[0] : deal.properties);
  const facts = z.object({ facts: z.record(z.string(), z.unknown()) }).safeParse(property);
  const listing = PublicListingMetadataSchema.safeParse(
    facts.success ? facts.data.facts.publicListing : null,
  );
  const links = artifactLinks(artifact?.content, artifact?.id ?? null);
  const lines = [
    `Context version: ${context.context_version}`,
    deal
      ? `Active deal: ${deal.address}${deal.city ? `, ${deal.city}` : ""} (${deal.status}) [${deal.id}]`
      : "Active deal: none",
    artifact
      ? `Active artifact: ${artifact.title} v${artifact.version} (${artifact.status}) [${artifact.id}]`
      : "Active artifact: none",
    `Private review URL: ${links.privateReviewUrl ?? "not created"}`,
    `Official public listing URL: ${links.publicListingUrl ?? (listing.success ? listing.data.url : "not available")}`,
    `Live Facebook URL: ${links.liveFacebookUrl ?? "not published"}`,
    action
      ? `Pending action: ${action.summary} (${action.status}) [${action.id}]`
      : "Pending action: none",
    workflow
      ? `Active durable work: ${workflow.workflow} (${workflow.status}) [${workflow.id}]`
      : "Active durable work: none",
  ];
  return lines.join("\n");
}
