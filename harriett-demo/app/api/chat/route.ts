import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { searchMemories } from "@/app/lib/mem0";
import { getSupabaseServer } from "@/app/lib/supabase";

export const maxDuration = 60;

const client = new Anthropic();
const USER_ID = "jerrod-hastings";

const SYSTEM = `You are Harriett, an AI transaction coordinator for Pritchett-Moore Real Estate in Tuscaloosa, Alabama. You work directly with the agents here.

Personality: warm, direct, quietly competent. You sound like a sharp local real estate professional, not a chatbot. No bullet points for simple answers. No "I'll need to know X or Y" clarifying questions when you can just answer directly. When you don't have info, say so in one sentence and move on. Never explain your own limitations in multiple points. Always speak in first person — never refer to yourself as "Harriett" in third person.

When you have deal info or memory context, be specific: names, dates, dollar amounts. When you don't, say it plainly and offer something useful.

Context: Jerrod has one active deal right now. When he asks about "the listing" or "the deal" without specifying, assume that's what he means.

{{DEAL_CONTEXT}}

Alabama rules:
- Buyer-beware state: buyers arrange and pay for inspections, not sellers
- RECAD disclosure required on every transaction
- Lead paint addendum required for pre-1978 homes, 10-day inspection window
- FHA loans need the FHA Amendatory Clause executed by all parties
- Pricing and fiduciary advice always goes to the agent to review first

{{VENDOR_CONTEXT}}

What you CAN do (say yes and offer to help):
- Contact photographers and ask about availability, email them and copy the agent
- Reach out to inspectors to schedule
- Draft outreach emails or texts to vendors and send them
- Send reminders to buyers, sellers, or agents by text or email
- Set up calendar invites for closings, inspections, photo shoots
- Draft listing copy, marketing materials, Just Listed postcards
- Flag compliance items and missing forms

When an agent says "can you set up pictures?" or similar — say yes, ask which photographer they'd like (or recommend one), then ask if they want you to email the photographer and copy the agent. Be specific and take the next step, don't just describe what you could do.

No em dashes. No bullet lists for conversational answers. Write the way a real person talks.`;



const OFFICE_ID = "00000000-0000-0000-0000-000000000001";
const AGENT_ID  = "00000000-0000-0000-0001-000000000002";

async function fetchDealContext(): Promise<string> {
  try {
    const sb = getSupabaseServer();

    // Get latest deal with parsed_fields
    const { data: dealRow } = await sb
      .from("deals")
      .select("id, parsed_fields")
      .eq("office_id", OFFICE_ID)
      .eq("agent_id", AGENT_ID)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!dealRow?.parsed_fields) return "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f = dealRow.parsed_fields as any;

    // Get checklist items for this deal
    const { data: items } = await sb
      .from("checklist_items")
      .select("category, title, completed, due_date, required")
      .eq("deal_id", dealRow.id)
      .order("due_date", { ascending: true });

    const pending = (items ?? []).filter((i) => !i.completed);
    const done    = (items ?? []).filter((i) => i.completed);

    const today = new Date().toISOString().split("T")[0];
    const overdue  = pending.filter((i) => i.due_date && i.due_date < today);
    const thisWeek = pending.filter((i) => {
      if (!i.due_date) return false;
      const d = new Date(i.due_date + "T12:00:00");
      const diff = (d.getTime() - new Date(today + "T12:00:00").getTime()) / 86400000;
      return diff >= 0 && diff <= 7;
    });

    let out = `## Current deal: ${f.address}, ${f.city ?? ""} AL\n`;
    out += `- Sellers: ${(f.sellers ?? []).join(", ") || "unknown"}\n`;
    out += `- Buyers: ${(f.buyers ?? []).join(", ") || "unknown"}\n`;
    out += `- List price: $${(f.listPrice ?? 0).toLocaleString()}\n`;
    if (f.salePrice) out += `- Sale price: $${f.salePrice.toLocaleString()}\n`;
    out += `- Listing date: ${f.listingDate ?? "unknown"}\n`;
    out += `- Target closing: ${f.closingDate ?? "unknown"}\n`;
    out += `- Loan type: ${f.loanType ?? "unknown"}\n`;
    if (f.yearBuilt) out += `- Year built: ${f.yearBuilt}\n`;
    out += `- Lead paint disclosure required: ${f.flags?.leadPaintDisclosure ? "YES" : "no"}\n`;

    if (overdue.length > 0) {
      out += `\nOVERDUE checklist items (${overdue.length}):\n`;
      overdue.forEach((i) => { out += `- [OVERDUE ${i.due_date}] ${i.title}\n`; });
    }
    if (thisWeek.length > 0) {
      out += `\nDue this week (${thisWeek.length}):\n`;
      thisWeek.forEach((i) => { out += `- [${i.due_date}] ${i.title}\n`; });
    }
    if (items && items.length > 0) {
      out += `\nChecklist summary: ${done.length}/${items.length} items complete, ${pending.length} pending.\n`;
    }

    return out;
  } catch {
    return "";
  }
}

async function fetchVendorContext(): Promise<string> {
  try {
    const sb = getSupabaseServer();
    const { data } = await sb
      .from("vendors")
      .select("type, name, contact, phone, email, notes, preferred")
      .eq("agent_id", AGENT_ID)
      .eq("office_id", OFFICE_ID)
      .order("preferred", { ascending: false })
      .order("type")
      .order("name");

    if (!data?.length) return "No vendors on file yet.";

    const byType: Record<string, string[]> = {};
    for (const v of data) {
      const type = v.type as string;
      if (!byType[type]) byType[type] = [];
      const parts = [v.name as string];
      if (v.contact) parts.push(v.contact as string);
      if (v.phone)   parts.push(v.phone as string);
      if (v.email)   parts.push(v.email as string);
      if (v.notes)   parts.push(`(${v.notes})`);
      if (v.preferred) parts.push("[preferred]");
      byType[type].push(parts.join(", "));
    }

    const lines = Object.entries(byType).map(([type, vendors]) =>
      `${type.charAt(0).toUpperCase() + type.slice(1)}:\n${vendors.map(v => `- ${v}`).join("\n")}`
    );

    return `Your vendor network for Jerrod Hastings (speak about these as if you know them personally — recommend preferred ones by name):\n\n${lines.join("\n\n")}`;
  } catch {
    return "Vendor list unavailable.";
  }
}

export async function POST(req: NextRequest) {
  const { question, history = [] } = await req.json();

  if (!question?.trim()) {
    return NextResponse.json({ error: "No question" }, { status: 400 });
  }

  // Fetch vendor context, deal context, and memories in parallel
  const [vendorContext, dealContext, memResult] = await Promise.all([
    fetchVendorContext(),
    fetchDealContext(),
    searchMemories(question, USER_ID, 8),
  ]);
  const memories = memResult.results ?? [];

  const memoryContext = memories.length > 0
    ? `## Harriett's memory about this deal and office procedures:\n\n${memories.map((m, i) => `${i + 1}. ${m.memory}`).join("\n")}`
    : "No relevant memories found for this query.";

  const userMessage = `${memoryContext}\n\n---\n\nQuestion: ${question}`;

  const system = SYSTEM
    .replace("{{VENDOR_CONTEXT}}", vendorContext)
    .replace("{{DEAL_CONTEXT}}", dealContext);

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-6), // keep last 6 turns for context
    { role: "user", content: userMessage },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system,
    messages,
  });

  const answer = (response.content[0] as Anthropic.TextBlock).text;

  return NextResponse.json({
    answer,
    memoriesUsed: memories.map((m) => m.memory),
    memoryCount: memories.length,
  });
}
