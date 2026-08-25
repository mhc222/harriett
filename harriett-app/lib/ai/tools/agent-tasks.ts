import { tasks } from "@trigger.dev/sdk";
import { tool } from "ai";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import type { SkillContext } from "@/lib/contracts/skills";

const TaskStatus = z.enum(["open", "in_progress", "waiting", "completed", "cancelled"]);
const TaskPriority = z.enum(["low", "normal", "high", "urgent"]);

const AgentTask = z.object({
  id: z.string().uuid(),
  title: z.string(),
  detail: z.string().nullable(),
  status: TaskStatus,
  priority: TaskPriority,
  dueAt: z.string().nullable(),
  reminderAt: z.string().nullable(),
  reminderSentAt: z.string().nullable(),
  dealId: z.string().uuid().nullable(),
  createdAt: z.string(),
});

function reminderChannel(channel: SkillContext["channel"]): "sms" | "whatsapp" {
  return channel === "whatsapp" ? "whatsapp" : "sms";
}

function requireFutureReminder(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("reminderAt must be a valid ISO date and time");
  if (date.getTime() <= Date.now()) throw new Error("reminderAt must be in the future");
  return date;
}

async function scheduleReminder(
  context: SkillContext,
  workItemId: string,
  reminderAt: Date
): Promise<string> {
  const handle = await tasks.trigger(
    "deliver-agent-reminder",
    { workItemId, expectedReminderAt: reminderAt.toISOString() },
    {
      delay: reminderAt,
      idempotencyKey: `work-item-reminder:${workItemId}:${reminderAt.toISOString()}`,
      idempotencyKeyTTL: "365d",
      concurrencyKey: context.agentId,
    }
  );
  const { error } = await context.db
    .from("work_items")
    .update({ reminder_run_id: handle.id })
    .eq("id", workItemId)
    .eq("office_id", context.officeId)
    .eq("owner_agent_id", context.agentId);
  if (error) throw new Error(`reminder run link failed: ${error.message}`);
  return handle.id;
}

function mapTask(row: Record<string, unknown>) {
  return AgentTask.parse({
    id: row.id,
    title: row.title,
    detail: row.detail,
    status: row.status,
    priority: row.priority,
    dueAt: row.due_at,
    reminderAt: row.reminder_at,
    reminderSentAt: row.reminder_sent_at,
    dealId: row.deal_id,
    createdAt: row.created_at,
  });
}

export function createAgentTaskTools(context: SkillContext) {
  return {
    listAgentTasks: tool({
      description: "List the agent's persistent personal and deal-related tasks. Use this before updating a task when the exact task ID is unknown.",
      inputSchema: z.object({
        status: z.enum(["active", "completed", "cancelled", "all"]).default("active"),
        dueBefore: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(30).default(15),
      }),
      execute: async (input) => {
        let query = context.db
          .from("work_items")
          .select("id, title, detail, status, priority, due_at, reminder_at, reminder_sent_at, deal_id, created_at")
          .eq("office_id", context.officeId)
          .or(`owner_agent_id.eq.${context.agentId},assigned_agent_id.eq.${context.agentId}`)
          .order("due_at", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(input.limit);
        if (input.status === "active") query = query.in("status", ["open", "in_progress", "waiting"]);
        else if (input.status !== "all") query = query.eq("status", input.status);
        if (input.dueBefore) query = query.lte("due_at", input.dueBefore);
        const { data, error } = await query;
        if (error) throw new Error(`task list failed: ${error.message}`);
        await writeAudit(context.db, {
          officeId: context.officeId,
          actor: "harriett",
          agentId: context.agentId,
          action: "task.listed",
          payload: { aiRunId: context.aiRunId, filters: input, count: data?.length ?? 0 },
        });
        return { tasks: (data ?? []).map(mapTask) };
      },
    }),
    createAgentTask: tool({
      description: "Create a persistent to-do for the agent. Include reminderAt only when the agent requested a reminder. Times must be exact ISO timestamps with an offset.",
      inputSchema: z.object({
        title: z.string().trim().min(1).max(300),
        detail: z.string().trim().max(2_000).optional(),
        priority: TaskPriority.default("normal"),
        dueAt: z.string().datetime({ offset: true }).optional(),
        reminderAt: z.string().datetime({ offset: true }).optional(),
        dealId: z.string().uuid().optional(),
      }),
      execute: async (input) => {
        const reminderAt = requireFutureReminder(input.reminderAt);
        const { data, error } = await context.db
          .from("work_items")
          .insert({
            office_id: context.officeId,
            owner_agent_id: context.agentId,
            assigned_agent_id: context.agentId,
            deal_id: input.dealId ?? null,
            source_ai_run_id: context.aiRunId,
            title: input.title,
            detail: input.detail ?? null,
            priority: input.priority,
            due_at: input.dueAt ?? null,
            reminder_at: reminderAt?.toISOString() ?? null,
            reminder_channel: reminderAt ? reminderChannel(context.channel) : null,
          })
          .select("id, title, detail, status, priority, due_at, reminder_at, reminder_sent_at, deal_id, created_at")
          .single();
        if (error || !data) throw new Error(`task creation failed: ${error?.message}`);
        const reminderRunId = reminderAt
          ? await scheduleReminder(context, data.id, reminderAt)
          : null;
        await writeAudit(context.db, {
          officeId: context.officeId,
          actor: "harriett",
          agentId: context.agentId,
          dealId: input.dealId,
          action: "task.created",
          payload: { aiRunId: context.aiRunId, taskId: data.id, reminderRunId, ...input },
        });
        return { task: mapTask(data), reminderScheduled: Boolean(reminderAt), reminderRunId };
      },
    }),
    updateAgentTask: tool({
      description: "Update, complete, reopen, or cancel one exact task. List tasks first when the task ID is unknown. Setting a new reminder replaces the prior reminder; clearing it prevents delivery.",
      inputSchema: z.object({
        taskId: z.string().uuid(),
        title: z.string().trim().min(1).max(300).optional(),
        detail: z.string().trim().max(2_000).nullable().optional(),
        status: TaskStatus.optional(),
        priority: TaskPriority.optional(),
        dueAt: z.string().datetime({ offset: true }).nullable().optional(),
        reminderAt: z.string().datetime({ offset: true }).nullable().optional(),
      }),
      execute: async (input) => {
        const reminderSpecified = input.reminderAt !== undefined;
        const reminderAt = requireFutureReminder(input.reminderAt);
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (input.title !== undefined) updates.title = input.title;
        if (input.detail !== undefined) updates.detail = input.detail;
        if (input.priority !== undefined) updates.priority = input.priority;
        if (input.dueAt !== undefined) updates.due_at = input.dueAt;
        if (input.status !== undefined) {
          updates.status = input.status;
          updates.completed_at = input.status === "completed" ? new Date().toISOString() : null;
        }
        if (reminderSpecified) {
          updates.reminder_at = reminderAt?.toISOString() ?? null;
          updates.reminder_channel = reminderAt ? reminderChannel(context.channel) : null;
          updates.reminder_sent_at = null;
          updates.reminder_run_id = null;
        }
        const { data, error } = await context.db
          .from("work_items")
          .update(updates)
          .eq("id", input.taskId)
          .eq("office_id", context.officeId)
          .or(`owner_agent_id.eq.${context.agentId},assigned_agent_id.eq.${context.agentId}`)
          .select("id, title, detail, status, priority, due_at, reminder_at, reminder_sent_at, deal_id, created_at")
          .maybeSingle();
        if (error) throw new Error(`task update failed: ${error.message}`);
        if (!data) throw new Error("task was not found or does not belong to this agent");
        const reminderRunId = reminderAt
          ? await scheduleReminder(context, data.id, reminderAt)
          : null;
        await writeAudit(context.db, {
          officeId: context.officeId,
          actor: "harriett",
          agentId: context.agentId,
          dealId: data.deal_id ?? undefined,
          action: "task.updated",
          payload: { aiRunId: context.aiRunId, taskId: data.id, reminderRunId, changes: input },
        });
        return { task: mapTask(data), reminderScheduled: Boolean(reminderAt), reminderRunId };
      },
    }),
  };
}
