import crypto from "node:crypto";
import { tasks } from "@trigger.dev/sdk";
import { tool } from "ai";
import { z } from "zod";
import type {
  ApprovalContext,
  SkillContext,
  SkillDefinition,
  SkillRisk,
} from "@/lib/contracts/skills";
import { requiredApproval } from "@/lib/ai/policy";
import { searchKnowledge } from "@/lib/knowledge";
import { SupabaseMemoryProvider } from "@/lib/memory";
import { createPropertyTools } from "@/lib/ai/tools/properties";
import { createGoogleWorkspaceTools } from "@/lib/ai/tools/google-workspace";
import { createActivityHistoryTools } from "@/lib/ai/tools/activity-history";
import { createAgentTaskTools } from "@/lib/ai/tools/agent-tasks";
import { createDealDocumentTools } from "@/lib/ai/tools/deal-documents";
import { parseGoogleActionPayload, ProposeGoogleActionInputSchema } from "@/lib/google-actions";
import { decideGoogleAction } from "@/lib/google-action-approval";
import type { ContextSource } from "@/lib/memory/routing";
import {
  createFacebookDraft,
  SocialPostTypeSchema,
  SocialShareModeSchema,
} from "@/lib/social-drafts";
import {
  AgentDealSearchInputSchema,
  AgentDealSearchOutputSchema,
  searchAgentDeals,
} from "@/lib/agent-deals";

export function defineSkill<I, O>(definition: SkillDefinition<I, O>): SkillDefinition<I, O> {
  return definition;
}

async function runSkill<I, O>(
  definition: SkillDefinition<I, O>,
  input: I,
  context: SkillContext
): Promise<O> {
  const parsedInput = definition.inputSchema.parse(input);
  const { data: run, error } = await context.db
    .from("skill_runs")
    .insert({
      office_id: context.officeId,
      agent_id: context.agentId,
      deal_id: context.dealId ?? null,
      ai_run_id: context.aiRunId,
      skill_name: definition.name,
      skill_version: definition.version,
      risk: definition.risk,
      status: "running",
      input: parsedInput,
    })
    .select("id")
    .single();
  if (error || !run) throw new Error(`skill run audit failed: ${error?.message}`);

  try {
    const output = definition.outputSchema.parse(await definition.execute(parsedInput, context));
    const { error: updateError } = await context.db
      .from("skill_runs")
      .update({ status: "completed", output, completed_at: new Date().toISOString() })
      .eq("id", run.id);
    if (updateError) throw new Error(`skill completion audit failed: ${updateError.message}`);
    return output;
  } catch (error) {
    await context.db
      .from("skill_runs")
      .update({
        status: "failed",
        error_code: error instanceof Error ? error.name : "unknown",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    throw error;
  }
}

const searchDealsSkill = defineSkill({
  name: "search_deals",
  version: "1.0.0",
  description: "Find the agent's active or historical deals by address or status.",
  inputSchema: AgentDealSearchInputSchema,
  outputSchema: AgentDealSearchOutputSchema,
  risk: "read" as SkillRisk,
  approvalPolicy: () => "none",
  execute: (input, context) => searchAgentDeals(context.db, context, input),
});

const CreateFacebookDraftInput = z.object({
  dealId: z.string().uuid(),
  postType: SocialPostTypeSchema.optional(),
  shareMode: SocialShareModeSchema.default("link_preview"),
  notes: z.string().trim().max(2_000).optional(),
});
const CreateFacebookDraftOutput = z.object({
  artifactId: z.string().uuid(),
  title: z.string(),
  message: z.string(),
  reviewUrl: z.string().url(),
  primaryImageUrl: z.string().url().nullable(),
  publicListingUrl: z.string().url().nullable(),
  generationMode: z.enum(["ai", "deterministic_fallback"]),
  published: z.literal(false),
});

const createFacebookDraftSkill = defineSkill({
  name: "create_facebook_draft",
  version: "1.0.0",
  description: "Create and save a review-only Facebook draft for one verified agent transaction. Find the exact deal with searchDeals first. This tool never publishes the post.",
  inputSchema: CreateFacebookDraftInput,
  outputSchema: CreateFacebookDraftOutput,
  risk: "internal_write" as SkillRisk,
  approvalPolicy: () => "none",
  execute: async (input, context) => {
    const { data: deal, error } = await context.db.from("deals")
      .select("id,status")
      .eq("id", input.dealId)
      .eq("office_id", context.officeId)
      .eq("agent_id", context.agentId)
      .single();
    if (error || !deal) throw new Error("the selected transaction was not found for this agent");
    const inferredPostType = deal.status === "closed"
      ? "just_sold"
      : deal.status === "under_contract"
        ? "under_contract"
        : "new_listing";
    const draft = await createFacebookDraft({
      db: context.db,
      officeId: context.officeId,
      agentId: context.agentId,
      actor: "harriett",
      proposalSource: "whatsapp_request",
      postType: input.postType ?? inferredPostType,
      shareMode: input.shareMode,
      dealId: deal.id,
      notes: input.notes,
    });
    return { ...draft, published: false as const };
  },
});

const ChecklistInput = z.object({ dealId: z.string().uuid() });
const ChecklistOutput = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    detail: z.string().nullable(),
    dueDate: z.string().nullable(),
    completed: z.boolean(),
    required: z.boolean(),
  })),
});

const readChecklistSkill = defineSkill({
  name: "read_checklist",
  version: "1.0.0",
  description: "Read checklist items for one of the agent's deals.",
  inputSchema: ChecklistInput,
  outputSchema: ChecklistOutput,
  risk: "read" as SkillRisk,
  approvalPolicy: () => "none",
  execute: async ({ dealId }, context) => {
    const { data, error } = await context.db
      .from("checklist_items")
      .select("id, title, detail, due_date, completed, required")
      .eq("office_id", context.officeId)
      .eq("agent_id", context.agentId)
      .eq("deal_id", dealId)
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) throw new Error(`checklist read failed: ${error.message}`);
    return {
      items: (data ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        detail: item.detail,
        dueDate: item.due_date,
        completed: item.completed,
        required: item.required,
      })),
    };
  },
});

const KnowledgeInput = z.object({ query: z.string().min(2).max(2_000), limit: z.number().int().min(1).max(8).default(5) });
const KnowledgeOutput = z.object({
  results: z.array(z.object({
    sourceId: z.string().uuid(),
    title: z.string(),
    section: z.string().nullable().optional(),
    content: z.string(),
    effectiveDate: z.string().nullable().optional(),
  })),
});

const searchKnowledgeSkill = defineSkill({
  name: "search_office_knowledge",
  version: "1.0.0",
  description: "Search published office procedures, forms, regulations, and templates.",
  inputSchema: KnowledgeInput,
  outputSchema: KnowledgeOutput,
  risk: "read" as SkillRisk,
  approvalPolicy: () => "none",
  execute: async (input, context) => {
    const results = await searchKnowledge({
      db: context.db,
      officeId: context.officeId,
      query: input.query,
      limit: input.limit,
    });
    await Promise.all(results.map((result, index) => context.db.from("retrieval_events").insert({
      office_id: context.officeId,
      agent_id: context.agentId,
      ai_run_id: context.aiRunId,
      source_type: "knowledge",
      source_id: result.sourceId,
      rank: index + 1,
      score: result.score,
      metadata: { title: result.title, section: result.section },
    })));
    return { results: results.map((result) => ({
      sourceId: result.sourceId,
      title: result.title,
      section: result.section,
      content: result.content,
      effectiveDate: result.effectiveDate,
    })) };
  },
});

const MemoryInput = z.object({ query: z.string().min(2).max(2_000), limit: z.number().int().min(1).max(8).default(5) });
const MemoryOutput = z.object({
  memories: z.array(z.object({ id: z.string().uuid(), category: z.string(), content: z.string(), confidence: z.number() })),
});

const recallMemorySkill = defineSkill({
  name: "recall_agent_memory",
  version: "1.0.0",
  description: "Recall the agent's own active preferences, style, relationships, and standing instructions.",
  inputSchema: MemoryInput,
  outputSchema: MemoryOutput,
  risk: "read" as SkillRisk,
  approvalPolicy: () => "none",
  execute: async (input, context) => {
    const provider = new SupabaseMemoryProvider(context.db);
    const memories = await provider.search(context.officeId, context.agentId, input.query, input.limit);
    await Promise.all(memories.map((memory, index) => context.db.from("retrieval_events").insert({
      office_id: context.officeId,
      agent_id: context.agentId,
      ai_run_id: context.aiRunId,
      source_type: "memory",
      source_id: memory.id,
      rank: index + 1,
      score: memory.score,
      metadata: { category: memory.category },
    })));
    return { memories: memories.map((memory) => ({
      id: memory.id,
      category: memory.category,
      content: memory.content,
      confidence: memory.confidence,
    })) };
  },
});

const ProposeActionOutput = z.object({
  actionId: z.string().uuid(),
  status: z.enum(["proposed", "approved"]),
  requiredApprover: z.enum(["agent", "broker", "none"]),
  message: z.string(),
});

const proposeActionSkill = defineSkill({
  name: "propose_google_action",
  version: "2.0.0",
  description: "Propose an exact Google Gmail, Calendar, or Contacts action. The action follows the agent and broker approval rules before execution.",
  inputSchema: ProposeGoogleActionInputSchema,
  outputSchema: ProposeActionOutput,
  risk: "external_write" as SkillRisk,
  approvalPolicy: () => "agent",
  execute: async (input, context) => {
    const exactPayload = parseGoogleActionPayload(input.action, input.payload);
    const { data: profile } = await context.db
      .from("agent_profiles")
      .select("email_mode, action_permissions")
      .eq("agent_id", context.agentId)
      .maybeSingle();
    const actionType = input.action.startsWith("calendar_")
      ? "calendar"
      : input.action.startsWith("contact_")
        ? "contact"
        : "email";
    const permission = profile?.action_permissions?.[input.action] as "auto" | "confirm" | undefined;
    const approval = requiredApproval({
      risk: "external_write",
      channel: actionType,
      recipientKind: input.recipientKind,
      emailMode: profile?.email_mode ?? "draft_only",
      actionPermission: permission ?? "confirm",
    } as ApprovalContext & { risk: SkillRisk; channel: "calendar" | "contact" | "email" });
    if (approval === "prohibited") throw new Error("requested action is prohibited by policy");
    const requiredApprover = approval;
    const status = approval === "none" ? "approved" : "proposed";
    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`${context.aiRunId}:${input.action}:${JSON.stringify(exactPayload)}`)
      .digest("hex");
    const { data, error } = await context.db
      .from("action_requests")
      .insert({
        office_id: context.officeId,
        agent_id: context.agentId,
        deal_id: context.dealId ?? null,
        ai_run_id: context.aiRunId,
        skill_name: input.action,
        exact_payload: exactPayload,
        summary: input.summary,
        recipient_kind: input.recipientKind,
        status,
        required_approver: requiredApprover,
        approved_at: approval === "none" ? new Date().toISOString() : null,
        idempotency_key: idempotencyKey,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`action proposal failed: ${error?.message}`);
    if (approval === "none") {
      await tasks.trigger(
        "execute-google-action",
        { actionRequestId: data.id },
        { idempotencyKey: ["google-action", data.id], idempotencyKeyTTL: "30d" }
      );
    }
    return {
      actionId: data.id,
      status,
      requiredApprover,
      message: approval === "none"
        ? "I queued the approved Google action."
        : "I saved the exact Google action for review. Nothing has been sent or changed yet.",
    };
  },
});

const ListPendingActionsInput = z.object({ limit: z.number().int().min(1).max(10).default(5) });
const ListPendingActionsOutput = z.object({
  actions: z.array(z.object({
    id: z.string().uuid(),
    action: z.string(),
    summary: z.string(),
    exactPayload: z.unknown(),
    requiredApprover: z.enum(["agent", "broker", "none"]),
    createdAt: z.string(),
  })),
});

const listPendingActionsSkill = defineSkill({
  name: "list_pending_google_actions",
  version: "1.0.0",
  description: "List the most recent Google actions waiting for approval, including their exact details and IDs.",
  inputSchema: ListPendingActionsInput,
  outputSchema: ListPendingActionsOutput,
  risk: "read" as SkillRisk,
  approvalPolicy: () => "none",
  execute: async (input, context) => {
    const { data, error } = await context.db
      .from("action_requests")
      .select("id, skill_name, summary, exact_payload, required_approver, created_at")
      .eq("office_id", context.officeId)
      .eq("status", "proposed")
      .order("created_at", { ascending: false })
      .limit(input.limit);
    if (error) throw new Error(`pending Google actions could not be loaded: ${error.message}`);
    return { actions: (data ?? []).map((action) => ({
      id: action.id,
      action: action.skill_name,
      summary: action.summary,
      exactPayload: action.exact_payload,
      requiredApprover: action.required_approver,
      createdAt: action.created_at,
    })) };
  },
});

const DecideActionInput = z.object({
  actionRequestId: z.string().uuid().optional(),
  decision: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(1_000).optional(),
});
const DecideActionOutput = z.object({
  actionRequestId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  runId: z.string().optional(),
});

const decideActionSkill = defineSkill({
  name: "decide_google_action",
  version: "1.0.0",
  description: "Approve or reject one pending Google action. If no ID is provided, decide the newest pending action visible to this user.",
  inputSchema: DecideActionInput,
  outputSchema: DecideActionOutput,
  risk: "external_write" as SkillRisk,
  approvalPolicy: () => "none",
  execute: async (input, context) => {
    let actionRequestId = input.actionRequestId;
    if (!actionRequestId) {
      const { data, error } = await context.db
        .from("action_requests")
        .select("id")
        .eq("office_id", context.officeId)
        .eq("status", "proposed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) throw new Error("there is no pending Google action to decide");
      actionRequestId = data.id;
    }
    return decideGoogleAction({
      db: context.db,
      officeId: context.officeId,
      actorAgentId: context.agentId,
      actorRole: context.role,
      actionRequestId: z.string().uuid().parse(actionRequestId),
      decision: input.decision,
      reason: input.reason,
    });
  },
});

export function createRuntimeTools(
  context: SkillContext,
  options?: { sources?: ContextSource[]; allowActionProposal?: boolean; allowApprovalDecision?: boolean }
) {
  const allowed = new Set<ContextSource>(options?.sources ?? [
    "structured",
    "memory",
    "knowledge",
    "property_provider",
  ]);
  const propertyTools = createPropertyTools({
    db: context.db,
    officeId: context.officeId,
    agentId: context.agentId,
    actor: "harriett",
    aiRunId: context.aiRunId,
  });
  const googleWorkspaceTools = createGoogleWorkspaceTools(context);
  const activityHistoryTools = createActivityHistoryTools(context);
  const agentTaskTools = createAgentTaskTools(context);
  const dealDocumentTools = createDealDocumentTools(context);
  return {
    ...(allowed.has("structured") ? { searchDeals: tool({
      description: searchDealsSkill.description,
      inputSchema: searchDealsSkill.inputSchema,
      execute: (input) => runSkill(searchDealsSkill, input, context),
    }) } : {}),
    ...(allowed.has("structured") ? { readChecklist: tool({
      description: readChecklistSkill.description,
      inputSchema: readChecklistSkill.inputSchema,
      execute: (input) => runSkill(readChecklistSkill, input, context),
    }) } : {}),
    ...(allowed.has("social") ? { createFacebookDraft: tool({
      description: createFacebookDraftSkill.description,
      inputSchema: createFacebookDraftSkill.inputSchema,
      execute: (input) => runSkill(createFacebookDraftSkill, input, context),
    }) } : {}),
    ...(allowed.has("knowledge") ? { searchOfficeKnowledge: tool({
      description: searchKnowledgeSkill.description,
      inputSchema: searchKnowledgeSkill.inputSchema,
      execute: (input) => runSkill(searchKnowledgeSkill, input, context),
    }) } : {}),
    ...(allowed.has("memory") ? { recallAgentMemory: tool({
      description: recallMemorySkill.description,
      inputSchema: recallMemorySkill.inputSchema,
      execute: (input) => runSkill(recallMemorySkill, input, context),
    }) } : {}),
    ...(options?.allowActionProposal ? { proposeGoogleAction: tool({
      description: proposeActionSkill.description,
      inputSchema: proposeActionSkill.inputSchema,
      execute: (input) => runSkill(proposeActionSkill, input, context),
    }) } : {}),
    ...(options?.allowApprovalDecision ? { listPendingGoogleActions: tool({
      description: listPendingActionsSkill.description,
      inputSchema: listPendingActionsSkill.inputSchema,
      execute: (input) => runSkill(listPendingActionsSkill, input, context),
    }) } : {}),
    ...(options?.allowApprovalDecision ? { decideGoogleAction: tool({
      description: decideActionSkill.description,
      inputSchema: decideActionSkill.inputSchema,
      execute: (input) => runSkill(decideActionSkill, input, context),
    }) } : {}),
    ...(allowed.has("property_provider") ? propertyTools : {}),
    ...(allowed.has("google_workspace") ? googleWorkspaceTools : {}),
    ...(allowed.has("history") ? activityHistoryTools : {}),
    ...(allowed.has("tasks") ? agentTaskTools : {}),
    ...(allowed.has("documents") ? dealDocumentTools : {}),
  };
}

export const skillRegistry = {
  searchDeals: searchDealsSkill,
  readChecklist: readChecklistSkill,
  searchOfficeKnowledge: searchKnowledgeSkill,
  recallAgentMemory: recallMemorySkill,
  proposeGoogleAction: proposeActionSkill,
  listPendingGoogleActions: listPendingActionsSkill,
  decideGoogleAction: decideActionSkill,
  createFacebookDraft: createFacebookDraftSkill,
} as const;
