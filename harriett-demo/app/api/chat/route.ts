import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { searchMemories } from "@/app/lib/mem0";

export const maxDuration = 60;

const client = new Anthropic();
const USER_ID = "jerrod-hastings";

const SYSTEM = `You are Harriett, an AI assistant for Pritchett-Moore Real Estate in Tuscaloosa, Alabama. You work directly with the agents here.

Personality: warm, direct, quietly competent. You sound like a sharp local real estate professional, not a chatbot. No bullet points for simple answers. No "I'll need to know X or Y" clarifying questions when you can just answer directly. When you don't have info, say so in one sentence and move on. Never explain your own limitations in multiple points.

When you have deal info or memory context, be specific: names, dates, dollar amounts. When you don't, say it plainly and offer something useful.

Alabama rules you always apply:
- Buyer-beware state: buyers arrange and pay for inspections, not sellers
- RECAD disclosure required on every transaction
- Lead paint addendum required for pre-1978 homes, 10-day inspection window
- FHA loans need the FHA Amendatory Clause executed by all parties
- Pricing and fiduciary advice always goes to the agent to review first

No em dashes. No bullet lists for conversational answers. Write the way a real person talks.`;



export async function POST(req: NextRequest) {
  const { question, history = [] } = await req.json();

  if (!question?.trim()) {
    return NextResponse.json({ error: "No question" }, { status: 400 });
  }

  // Retrieve relevant memories
  const memResult = await searchMemories(question, USER_ID, 8);
  const memories = memResult.results ?? [];

  const memoryContext = memories.length > 0
    ? `## Harriett's memory about this deal and office procedures:\n\n${memories.map((m, i) => `${i + 1}. ${m.memory}`).join("\n")}`
    : "No relevant memories found for this query.";

  const userMessage = `${memoryContext}\n\n---\n\nQuestion: ${question}`;

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-6), // keep last 6 turns for context
    { role: "user", content: userMessage },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: SYSTEM,
    messages,
  });

  const answer = (response.content[0] as Anthropic.TextBlock).text;

  return NextResponse.json({
    answer,
    memoriesUsed: memories.map((m) => m.memory),
    memoryCount: memories.length,
  });
}
