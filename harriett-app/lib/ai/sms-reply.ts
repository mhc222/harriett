import { generateText, stepCountIs, type LanguageModel, type ModelMessage } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FALLBACK_MODEL, PRIMARY_MODEL } from "@/lib/ai/generate";
import { createPropertyTools } from "@/lib/ai/tools/properties";

interface SmsHistoryRow {
  direction: "inbound" | "outbound";
  body: string;
}

interface DealSummary {
  address: string;
  status: string;
  listing_date: string | null;
  contract_acceptance_date: string | null;
  closing_date: string | null;
}

export async function generateAgentSmsReply(opts: {
  db: SupabaseClient;
  officeId: string;
  officeName: string;
  agentId: string;
  agentName: string;
  aiRunId: string;
  history: SmsHistoryRow[];
  deals: DealSummary[];
}): Promise<string> {
  const messages: ModelMessage[] = opts.history.map((message) => ({
    role: message.direction === "inbound" ? "user" : "assistant",
    content: message.body,
  }));
  const tools = createPropertyTools({
    db: opts.db,
    officeId: opts.officeId,
    agentId: opts.agentId,
    actor: "harriett",
    aiRunId: opts.aiRunId,
  });
  const instructions = `You are Harriett, the AI transaction assistant for ${opts.officeName}.

You are texting ${opts.agentName}, a real estate professional. Respond directly to the agent's latest message.

Rules:
- Keep the response useful and natural, usually 2 to 6 short sentences.
- Use plain text only. Do not use markdown tables or headings.
- You may discuss the agent's deals and use the available read-only property tools.
- Public property results are preliminary. Repeat the verification notice returned by the tool.
- Never claim you completed an action unless a tool actually completed it.
- Never text a consumer. This conversation is only with the enrolled agent.
- If the request needs broker approval, explain that briefly and offer the next step.
- Do not invent deal facts, dates, contacts, or MLS data.

Current deal context:
${JSON.stringify(opts.deals)}`;

  const run = (model: LanguageModel) =>
    generateText({
      model,
      instructions,
      messages,
      tools,
      stopWhen: stepCountIs(4),
      maxOutputTokens: 500,
    });

  let result;
  try {
    result = await run(PRIMARY_MODEL);
  } catch (primaryError) {
    if (!process.env.OPENAI_API_KEY) throw primaryError;
    console.error("[sms] primary model failed, using fallback:", primaryError);
    result = await run(FALLBACK_MODEL);
  }

  const reply = result.text.trim();
  if (!reply) throw new Error("Harriett generated an empty SMS reply");
  return reply;
}
