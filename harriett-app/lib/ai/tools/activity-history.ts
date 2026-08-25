import { tool } from "ai";
import { z } from "zod";
import type { SkillContext } from "@/lib/contracts/skills";
import { withSkillTrace } from "@/lib/execution-trace";

const SearchActivitySchema = z.object({
  query: z.string().trim().max(200).optional(),
  timeMin: z.string().datetime({ offset: true }).optional(),
  timeMax: z.string().datetime({ offset: true }).optional(),
  days: z.number().int().min(1).max(730).default(30),
  limit: z.number().int().min(1).max(50).default(20),
});

function cleanSearchTerm(value: string): string {
  return value.replace(/[%_,()]/g, " ").trim();
}

export function createActivityHistoryTools(context: SkillContext) {
  return {
    searchAgentHistory: tool({
      description: "Search this agent's retained conversation and work history across SMS, WhatsApp, and the Harriett app. Also returns actions and property research from the same time window. Use this for questions about yesterday, last week, earlier work, or prior decisions.",
      inputSchema: SearchActivitySchema,
      execute: (input) => withSkillTrace(
        {
          db: context.db,
          officeId: context.officeId,
          agentId: context.agentId,
          aiRunId: context.aiRunId,
        },
        { name: "agent_history_search", version: "1.0.0", risk: "read", input },
        async () => {
          const timeMin = input.timeMin
            ?? new Date(Date.now() - input.days * 24 * 60 * 60 * 1000).toISOString();
          const timeMax = input.timeMax ?? new Date().toISOString();
          let messagesQuery = context.db
            .from("messages")
            .select("id, direction, channel, body, deal_id, created_at")
            .eq("office_id", context.officeId)
            .eq("agent_id", context.agentId)
            .in("channel", ["sms", "whatsapp", "pwa"])
            .gte("created_at", timeMin)
            .lt("created_at", timeMax)
            .order("created_at", { ascending: false })
            .limit(input.limit);
          if (input.query) {
            const term = cleanSearchTerm(input.query);
            if (term) messagesQuery = messagesQuery.ilike("body", `%${term}%`);
          }

          const [messagesResult, actionsResult, researchResult] = await Promise.all([
            messagesQuery,
            context.db
              .from("action_requests")
              .select("id, skill_name, summary, status, created_at, updated_at")
              .eq("office_id", context.officeId)
              .eq("agent_id", context.agentId)
              .gte("created_at", timeMin)
              .lt("created_at", timeMax)
              .order("created_at", { ascending: false })
              .limit(10),
            context.db
              .from("property_research_runs")
              .select("id, research_type, provider, status, summary, created_at, properties(formatted_address)")
              .eq("office_id", context.officeId)
              .eq("agent_id", context.agentId)
              .gte("created_at", timeMin)
              .lt("created_at", timeMax)
              .order("created_at", { ascending: false })
              .limit(10),
          ]);
          if (messagesResult.error) throw new Error(`conversation history search failed: ${messagesResult.error.message}`);
          if (actionsResult.error) throw new Error(`action history search failed: ${actionsResult.error.message}`);
          if (researchResult.error) throw new Error(`research history search failed: ${researchResult.error.message}`);
          return {
            timeMin,
            timeMax,
            messages: (messagesResult.data ?? []).map((message) => ({
              ...message,
              body: message.body.slice(0, 1_000),
            })),
            actions: actionsResult.data ?? [],
            research: researchResult.data ?? [],
          };
        }
      ),
    }),
  };
}
