import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { searchMemories, addMemories } from "@/app/lib/mem0";
import { getSupabaseServer } from "@/app/lib/supabase";

export const maxDuration = 60;

const client = new Anthropic();
const USER_ID = "jerrod-hastings";

const SYSTEM = `You are Harriett, an AI transaction coordinator for Pritchett-Moore Real Estate in Tuscaloosa, Alabama. You are speaking with Tanner Ashcraft (Associate Broker) or Jerrod Hastings (agent) over WhatsApp.

You have Harriett's memory loaded with deal facts, office procedures, and Alabama real estate law. Use retrieved context to answer accurately and specifically.

Rules:
- WhatsApp, not email. 3-5 sentences unless more is genuinely needed.
- Cite actual names, numbers, and dates from memory.
- Alabama buyer-beware: buyers arrange and pay for their own inspections.
- RECAD agency disclosure required on every transaction.
- For pricing advice or fiduciary decisions, flag for human review. Never give autonomous pricing guidance.
- If something is outside your memory, say so clearly.
- No em dashes. Use commas, semicolons, or sentence breaks.
- Plain English. No jargon.
- Sign off as "Harriett" when closing a reply.`;

function twiml(body: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(body)}</Message></Response>`;
  return new NextResponse(xml, {
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function POST(req: NextRequest) {
  const text = await req.text();
  const params = new URLSearchParams(text);
  const body = params.get("Body")?.trim();
  const from = params.get("From") ?? "unknown";
  const profileName = params.get("ProfileName") ?? from;

  if (!body) {
    return twiml("Hey, I didn't catch that. What can I help you with?");
  }

  const sb = getSupabaseServer();
  const OFFICE_ID = "00000000-0000-0000-0000-000000000001";
  const AGENT_ID  = "00000000-0000-0000-0001-000000000002"; // Jerrod

  // Save inbound message
  await sb.from("messages").insert({
    office_id:        OFFICE_ID,
    agent_id:         AGENT_ID,
    direction:        "inbound",
    channel:          "sms",
    body,
    status:           "approved",
    harriett_action:  "whatsapp_inbound",
  });

  try {
    const memResult = await searchMemories(body, USER_ID, 8);
    const memories = memResult.results ?? [];

    const memoryContext =
      memories.length > 0
        ? `## Harriett's memory context:\n\n${memories.map((m, i) => `${i + 1}. ${m.memory}`).join("\n")}`
        : "No relevant memories found for this query.";

    const userMessage = `${memoryContext}\n\n---\n\nMessage from ${profileName}: ${body}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 512,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    });

    const answer = (response.content[0] as Anthropic.TextBlock).text;

    // Save outbound reply + distill exchange into Mem0
    await Promise.all([
      sb.from("messages").insert({
        office_id:       OFFICE_ID,
        agent_id:        AGENT_ID,
        direction:       "outbound",
        channel:         "sms",
        body:            answer,
        status:          "sent",
        harriett_action: "whatsapp_reply",
      }),
      addMemories(
        [
          { role: "user",      content: body },
          { role: "assistant", content: answer },
        ],
        USER_ID
      ),
    ]);

    return twiml(answer);
  } catch (err) {
    console.error("[twilio-webhook] error:", err);
    return twiml(
      "Something went wrong on my end. Try again in a moment, or reach out to Matt if this keeps happening."
    );
  }
}
