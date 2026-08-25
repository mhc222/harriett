import crypto from "node:crypto";
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
import type { ContextSource } from "@/lib/memory/routing";

const JsonObjectSchema = z.record(z.string(), z.unknown());

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

const SearchDealsInput = z.object({
  query: z.string().trim().max(200).optional(),
  includeClosed: z.boolean().default(false),
  limit: z.number().int().min(1).max(20).default(10),
});
const SearchDealsOutput = z.object({
  deals: z.array(z.object({
    id: z.string().uuid(),
    address: z.string(),
    city: z.string().nullable(),
    status: z.string(),
    listPrice: z.number().nullable(),
    salePrice: z.number().nullable(),
    contractAcceptanceDate: z.string().nullable(),
    closingDate: z.string().nullable(),
  })),
});

const searchDealsSkill = defineSkill({
  name: "search_deals",
  version: "1.0.0",
  description: "Find the agent's active or historical deals by address or status.",
  inputSchema: SearchDealsInput,
  outputSchema: SearchDealsOutput,
  risk: "read" as SkillRisk,
  approvalPolicy: () => "none",
  execute: async (input, context) => {
    let query = context.db
      .from("deals")
      .select("id, address, city, status, list_price, sale_price, contract_acceptance_date, closing_date")
      .eq("office_id", context.officeId)
      .eq("agent_id", context.agentId)
      .order("updated_at", { ascending: false })
      .limit(input.limit);
    if (!input.includeClosed) query = query.not("status", "in", "(closed,cancelled)");
    if (input.query) query = query.ilike("address", `%${input.query}%`);
    const { data, error } = await query;
    if (error) throw new Error(`deal search failed: ${error.message}`);
    return {
      deals: (data ?? []).map((deal) => ({
        id: deal.id,
        address: deal.address,
        city: deal.city,
        status: deal.status,
        listPrice: deal.list_price == null ? null : Number(deal.list_price),
        salePrice: deal.sale_price == null ? null : Number(deal.sale_price),
        contractAcceptanceDate: deal.contract_acceptance_date,
        closingDate: deal.closing_date,
      })),
    };
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

const ProposeActionInput = z.object({
  action: z.enum([
    "calendar_create", "calendar_edit", "calendar_delete",
    "contact_create", "contact_edit", "contact_delete",
    "email_draft", "email_send",
  ]),
  summary: z.string().min(1).max(500),
  recipientKind: z.enum(["internal", "agent", "vendor", "consumer"]).default("internal"),
  payload: JsonObjectSchema,
});
const ProposeActionOutput = z.object({
  actionId: z.string().uuid(),
  status: z.literal("proposed"),
  requiredApprover: z.enum(["agent", "broker"]),
  message: z.string(),
});

const proposeActionSkill = defineSkill({
  name: "propose_outlook_action",
  version: "1.0.0",
  description: "Propose an exact Outlook email, calendar, or contact action for approval. This never performs the external action immediately.",
  inputSchema: ProposeActionInput,
  outputSchema: ProposeActionOutput,
  risk: "external_write" as SkillRisk,
  approvalPolicy: () => "agent",
  execute: async (input, context) => {
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
    if (approval === "prohibited" || approval === "none") {
      // External tools are intentionally shadow-mode in this phase. Even an
      // agent setting of auto remains a proposed action until the connector is live.
      if (approval === "prohibited") throw new Error("requested action is prohibited by policy");
    }
    const requiredApprover = input.recipientKind === "consumer" ? "broker" : "agent";
    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`${context.aiRunId}:${input.action}:${JSON.stringify(input.payload)}`)
      .digest("hex");
    const { data, error } = await context.db
      .from("action_requests")
      .insert({
        office_id: context.officeId,
        agent_id: context.agentId,
        deal_id: context.dealId ?? null,
        ai_run_id: context.aiRunId,
        skill_name: input.action,
        exact_payload: input.payload,
        summary: input.summary,
        recipient_kind: input.recipientKind,
        required_approver: requiredApprover,
        idempotency_key: idempotencyKey,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`action proposal failed: ${error?.message}`);
    return {
      actionId: data.id,
      status: "proposed" as const,
      requiredApprover,
      message: "I saved the exact action for review. Nothing has been sent or changed yet.",
    };
  },
});

export function createRuntimeTools(
  context: SkillContext,
  options?: { sources?: ContextSource[]; allowActionProposal?: boolean }
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
    ...(options?.allowActionProposal ? { proposeOutlookAction: tool({
      description: proposeActionSkill.description,
      inputSchema: proposeActionSkill.inputSchema,
      execute: (input) => runSkill(proposeActionSkill, input, context),
    }) } : {}),
    ...(allowed.has("property_provider") ? propertyTools : {}),
    ...(allowed.has("google_workspace") ? googleWorkspaceTools : {}),
  };
}

export const skillRegistry = {
  searchDeals: searchDealsSkill,
  readChecklist: readChecklistSkill,
  searchOfficeKnowledge: searchKnowledgeSkill,
  recallAgentMemory: recallMemorySkill,
  proposeOutlookAction: proposeActionSkill,
} as const;
