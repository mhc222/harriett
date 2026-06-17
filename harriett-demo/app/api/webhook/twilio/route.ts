import { NextRequest, NextResponse, after } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { searchMemories, addMemories, seedDealMemory } from "@/app/lib/mem0";
import { getSupabaseServer } from "@/app/lib/supabase";
import { callClaudeWithPdf } from "@/app/lib/claude";
import { PARSE_SYSTEM } from "@/app/lib/prompts";
import type { DealFields } from "@/app/lib/types";

export const maxDuration = 90;

const client = new Anthropic();
const USER_ID = "jerrod-hastings";

const OFFICE_ID = "00000000-0000-0000-0000-000000000001";
const AGENT_ID = "00000000-0000-0000-0001-000000000002"; // Jerrod Hastings

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

async function sendWhatsApp(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_WHATSAPP_FROM!; // e.g. whatsapp:+14155238886
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[twilio] sendWhatsApp failed:", err);
  }
}

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

async function fetchTwilioMedia(
  mediaUrl: string,
  accountSid: string,
  authToken: string
): Promise<{ base64: string; mediaType: string }> {
  const res = await fetch(mediaUrl, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    },
  });
  if (!res.ok) throw new Error(`Media fetch failed: ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "application/pdf";
  const buf = await res.arrayBuffer();
  return {
    base64: Buffer.from(buf).toString("base64"),
    mediaType: contentType.split(";")[0].trim(),
  };
}

async function writeDealRow(
  deal: DealFields,
  source: "manual" | "email_parse"
): Promise<string | null> {
  const sb = getSupabaseServer();
  const status = deal.salePrice ? "under_contract" : "listing_active";

  // Delete any prior row for this address so re-running the demo stays clean.
  await sb.from("deals").delete().eq("address", deal.address).eq("office_id", OFFICE_ID);

  const { data, error } = await sb
    .from("deals")
    .insert({
      office_id: OFFICE_ID,
      agent_id: AGENT_ID,
      address: deal.address,
      city: deal.city,
      state: deal.state,
      zip: deal.zip,
      county: deal.county ?? null,
      status,
      list_price: deal.listPrice,
      sale_price: deal.salePrice ?? null,
      listing_date: deal.listingDate || null,
      closing_date: deal.closingDate || null,
      parsed_fields: deal as unknown as Record<string, unknown>,
      source,
    })
    .select("id")
    .single();

  if (error) console.error("[webhook] deal row write failed:", error.message);
  return data?.id ?? null;
}

async function writeCalendarEvents(dealId: string, deal: DealFields): Promise<void> {
  const sb = getSupabaseServer();
  const events: Array<{
    office_id: string;
    deal_id: string;
    agent_id: string;
    title: string;
    date: string;
    type: string;
    address: string;
    note?: string;
  }> = [];

  const addr = deal.address;

  // Closing date and inspection deadline
  if (deal.closingDate) {
    events.push({
      office_id: OFFICE_ID,
      deal_id: dealId,
      agent_id: AGENT_ID,
      title: "Closing",
      date: deal.closingDate,
      type: "closing",
      address: addr,
      note: `$${deal.salePrice?.toLocaleString() ?? deal.listPrice.toLocaleString()}`,
    });

    // Inspection deadline: closing_date minus 10 days (Alabama buyer-beware default)
    const closingMs = new Date(deal.closingDate).getTime();
    const inspDate = new Date(closingMs - 10 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    events.push({
      office_id: OFFICE_ID,
      deal_id: dealId,
      agent_id: AGENT_ID,
      title: "Inspection Deadline",
      date: inspDate,
      type: "inspection",
      address: addr,
      note: "Buyer arranges and pays for inspection (Alabama buyer-beware)",
    });
  }

  // Listing date
  if (deal.listingDate) {
    events.push({
      office_id: OFFICE_ID,
      deal_id: dealId,
      agent_id: AGENT_ID,
      title: "Listing Active",
      date: deal.listingDate,
      type: "listing",
      address: addr,
    });
  }

  // Lead paint 10-day window (same deadline as inspection for pre-1978 properties)
  if (deal.flags?.leadPaintDisclosure && deal.closingDate) {
    const closingMs = new Date(deal.closingDate).getTime();
    const leadEnd = new Date(closingMs - 10 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    events.push({
      office_id: OFFICE_ID,
      deal_id: dealId,
      agent_id: AGENT_ID,
      title: "Lead Paint 10-Day Window Ends",
      date: leadEnd,
      type: "deadline",
      address: addr,
      note: "Pre-1978 property — federal 10-day lead paint inspection window",
    });
  }

  if (events.length > 0) {
    const { error } = await sb.from("calendar_events").insert(events);
    if (error) console.error("[webhook] calendar_events write failed:", error.message);
  }
}

function buildPdfReply(deal: DealFields): string {
  const sellersStr =
    deal.sellers.length > 0 ? deal.sellers.join(" and ") : "the sellers";
  const buyersStr =
    deal.buyers.length > 0 ? deal.buyers.join(" and ") : "the buyers";
  const price = deal.salePrice
    ? `$${deal.salePrice.toLocaleString()}`
    : `listed at $${deal.listPrice.toLocaleString()}`;
  const closing = deal.closingDate
    ? `closing ${deal.closingDate}`
    : "closing date not yet set";

  const flags: string[] = [];
  if (deal.flags.leadPaintDisclosure)
    flags.push("lead paint disclosure required (pre-1978 property)");
  if (deal.flags.fhaLoan) flags.push("FHA loan — Amendatory Clause needed");
  if (deal.flags.loanTypeChanged)
    flags.push("loan type changed mid-transaction — re-execute FHA Amendatory Clause");

  const flagLine =
    flags.length > 0 ? ` Compliance note: ${flags.join("; ")}.` : "";

  return `Got it. I've loaded ${deal.address} into the platform. Here's what I see: ${sellersStr} selling to ${buyersStr}, ${closing}, ${price}.${flagLine} I've set up the checklist and calendar. — Harriett`;
}

export async function POST(req: NextRequest) {
  const text = await req.text();
  const params = new URLSearchParams(text);
  const body = params.get("Body")?.trim();
  const from = params.get("From") ?? "unknown";
  const profileName = params.get("ProfileName") ?? from;
  const numMedia = parseInt(params.get("NumMedia") ?? "0", 10);
  const mediaUrl = params.get("MediaUrl0");
  const mediaType = params.get("MediaContentType0") ?? "";

  console.log("[twilio-webhook] params:", {
    From: from,
    Body: body,
    NumMedia: numMedia,
    MediaUrl0: mediaUrl,
    MediaContentType0: mediaType,
  });

  const hasMedia = numMedia > 0 && !!mediaUrl;
  // Accept pdf, octet-stream, or any document type Twilio/WhatsApp might send
  const isPdf =
    mediaType.includes("pdf") ||
    mediaType.includes("octet-stream") ||
    (hasMedia && (mediaUrl?.toLowerCase().includes(".pdf") ?? false));

  if (!body && !hasMedia) {
    return twiml("Hey, I didn't catch that. What can I help you with?");
  }

  const sb = getSupabaseServer();

  // Save inbound message
  await sb.from("messages").insert({
    office_id: OFFICE_ID,
    agent_id: AGENT_ID,
    direction: "inbound",
    channel: "sms",
    body: body ?? "[document]",
    status: "approved",
    harriett_action: "whatsapp_inbound",
  });

  try {
    // PDF parse-and-store path
    // Respond immediately so Twilio doesn't time out (PDF parse via Claude takes 20-40s).
    // after() runs the heavy work after the response is sent, then sends the real reply
    // back via Twilio REST API.
    if (hasMedia && mediaUrl && isPdf) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID!;
      const authToken = process.env.TWILIO_AUTH_TOKEN!;
      const capturedFrom = from;
      const capturedBody = body;

      after(async () => {
        try {
          const { base64 } = await fetchTwilioMedia(mediaUrl, accountSid, authToken);

          const raw = await callClaudeWithPdf(PARSE_SYSTEM, base64);
          const deal: DealFields = JSON.parse(raw);

          const dealId = await writeDealRow(deal, "email_parse");

          await Promise.all([
            dealId ? writeCalendarEvents(dealId, deal) : Promise.resolve(),
            seedDealMemory(deal, USER_ID),
          ]);

          const answer = buildPdfReply(deal);

          await Promise.all([
            sb.from("messages").insert({
              office_id: OFFICE_ID,
              agent_id: AGENT_ID,
              direction: "outbound",
              channel: "sms",
              body: answer,
              status: "sent",
              harriett_action: "whatsapp_reply",
            }),
            addMemories(
              [
                { role: "user", content: capturedBody ?? "[document]" },
                { role: "assistant", content: answer },
              ],
              USER_ID
            ),
            sendWhatsApp(capturedFrom, answer),
          ]);
        } catch (err) {
          console.error("[twilio-webhook] pdf after() error:", err);
          await sendWhatsApp(
            capturedFrom,
            "Something went wrong reading that PDF. Try again or send it as a text description."
          );
        }
      });

      return twiml(
        "Got your PDF. Harriett is reading through it now — I'll send you the details in a moment."
      );
    }

    // Text-only message path (unchanged)
    const queryText = body ?? "What can you help me with?";
    const memResult = await searchMemories(queryText, USER_ID, 8);
    const memories = memResult.results ?? [];

    const memoryContext =
      memories.length > 0
        ? `## Harriett's memory context:\n\n${memories.map((m, i) => `${i + 1}. ${m.memory}`).join("\n")}`
        : "No relevant memories found for this query.";

    const contextPrefix = `${memoryContext}\n\n---\n\nMessage from ${profileName}: `;

    const userContent: Anthropic.MessageParam["content"] = [
      { type: "text", text: `${contextPrefix}${body}` },
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 512,
      system: SYSTEM,
      messages: [{ role: "user", content: userContent }],
    });

    let answer = (response.content[0] as Anthropic.TextBlock).text;

    // Parse and fire any calendar invite tag Harriett embedded in her reply
    const inviteMatch = answer.match(
      /\[SEND_INVITE:([^|]+)\|([^|]+)\|(\d{4}-\d{2}-\d{2})\]/
    );
    if (inviteMatch) {
      answer = answer.replace(inviteMatch[0], "").trim();
      const [, eventType, address, date] = inviteMatch;
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? "https://harriett-demo.vercel.app";
      // Fire and forget — don't block the WhatsApp reply
      fetch(`${baseUrl}/api/calendar/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: from.replace("whatsapp:", ""),
          eventType,
          address,
          date,
        }),
      }).catch((e) => console.error("[twilio] invite send failed:", e));
    }

    // Save outbound reply + distill exchange into Mem0
    await Promise.all([
      sb.from("messages").insert({
        office_id: OFFICE_ID,
        agent_id: AGENT_ID,
        direction: "outbound",
        channel: "sms",
        body: answer,
        status: "sent",
        harriett_action: "whatsapp_reply",
      }),
      addMemories(
        [
          { role: "user", content: body ?? "[document]" },
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
