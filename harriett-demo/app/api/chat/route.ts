import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { searchMemories } from "@/app/lib/mem0";

export const maxDuration = 60;

const client = new Anthropic();
const USER_ID = "jerrod-hastings";

const SYSTEM = `You are Harriett, an AI transaction coordinator assistant for Pritchett-Moore Real Estate in Tuscaloosa, Alabama. You are speaking directly with Tanner Ashcraft (Associate Broker) or Jerrod Hastings (agent).

You have access to Harriett's memory about the current deal and office procedures. Use the retrieved memory context to answer questions accurately and specifically.

Rules:
- Be direct and specific — cite actual names, numbers, and dates from memory
- Alabama buyer-beware state: buyers arrange and pay for their own inspections
- RECAD agency disclosure required on every transaction
- Human-in-the-loop for any pricing advice or fiduciary decisions
- If a question is outside your memory context, say so clearly
- No em dashes — use commas, semicolons, or sentence breaks instead
- Plain English, no jargon`;

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
