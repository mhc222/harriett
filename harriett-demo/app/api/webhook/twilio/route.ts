import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { searchMemories, addMemories } from "@/app/lib/mem0";
import { getSupabaseServer } from "@/app/lib/supabase";

export const maxDuration = 90;

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
- Sign off as "Harriett" when closing a reply.
- You can send calendar invites for closings, inspections, photo shoots, and any deal milestone. When you do, say "I've sent a calendar invite to your email" in your reply.
- If the agent asks you to send a calendar invite or schedule something, include EXACTLY this tag at the end of your response on its own line: [SEND_INVITE:eventType|address|YYYY-MM-DD] — e.g. [SEND_INVITE:Closing|604 2nd St NW Gordo AL|2026-06-05]`;

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

async function fetchTwilioMedia(mediaUrl: string, accountSid: string, authToken: string): Promise<{ base64: string; mediaType: string }> {
  const res = await fetch(mediaUrl, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    },
  });
  if (!res.ok) throw new Error(`Media fetch failed: ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "application/pdf";
  const buf = await res.arrayBuffer();
  return { base64: Buffer.from(buf).toString("base64"), mediaType: contentType.split(";")[0].trim() };
}

export async function POST(req: NextRequest) {
  const text = await req.text();
  const params = new URLSearchParams(text);
  const body = params.get("Body")?.trim();
  const from = params.get("From") ?? "unknown";
  const profileName = params.get("ProfileName") ?? from;
  const numMedia = parseInt(params.get("NumMedia") ?? "0", 10);
  const mediaUrl = params.get("MediaUrl0");
  const mediaType = params.get("MediaContentType0") ?? "application/pdf";

  const hasMedia = numMedia > 0 && !!mediaUrl;

  if (!body && !hasMedia) {
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
    body:             body ?? "[document]",
    status:           "approved",
    harriett_action:  "whatsapp_inbound",
  });

  try {
    const queryText = body || "Read this document and summarize the key deal details.";
    const memResult = await searchMemories(queryText, USER_ID, 8);
    const memories = memResult.results ?? [];

    const memoryContext =
      memories.length > 0
        ? `## Harriett's memory context:\n\n${memories.map((m, i) => `${i + 1}. ${m.memory}`).join("\n")}`
        : "No relevant memories found for this query.";

    const contextPrefix = `${memoryContext}\n\n---\n\nMessage from ${profileName}: `;

    // Build message content — include PDF document block if present
    let userContent: Anthropic.MessageParam["content"];

    if (hasMedia && mediaUrl && (mediaType.includes("pdf") || mediaType.includes("octet-stream"))) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID!;
      const authToken  = process.env.TWILIO_AUTH_TOKEN!;
      const { base64 } = await fetchTwilioMedia(mediaUrl, accountSid, authToken);
      userContent = [
        {
          type: "document" as const,
          source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 },
        },
        {
          type: "text",
          text: `${contextPrefix}${body ?? "I just forwarded you a document. Read it carefully and tell me the key deal details: parties, property address, sale price, loan type, closing date, and any compliance flags (lead paint, FHA, dual agency, RECAD)."}`,
        },
      ];
    } else {
      userContent = [{ type: "text", text: `${contextPrefix}${body}` }];
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 512,
      system: SYSTEM,
      messages: [{ role: "user", content: userContent }],
    });

    let answer = (response.content[0] as Anthropic.TextBlock).text;

    // Parse and fire any calendar invite tag Harriett embedded in her reply
    const inviteMatch = answer.match(/\[SEND_INVITE:([^|]+)\|([^|]+)\|(\d{4}-\d{2}-\d{2})\]/);
    if (inviteMatch) {
      answer = answer.replace(inviteMatch[0], "").trim();
      const [, eventType, address, date] = inviteMatch;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://harriett-demo.vercel.app";
      // Fire and forget — don't block the WhatsApp reply
      fetch(`${baseUrl}/api/calendar/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: from.replace("whatsapp:", ""), eventType, address, date }),
      }).catch((e) => console.error("[twilio] invite send failed:", e));
    }

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
          { role: "user",      content: body ?? "[document]" },
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
