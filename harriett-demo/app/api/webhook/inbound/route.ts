import { NextRequest, NextResponse, after } from "next/server";
import { callClaudeWithPdf } from "@/app/lib/claude";
import { PARSE_SYSTEM } from "@/app/lib/prompts";
import { getSupabaseServer } from "@/app/lib/supabase";
import { seedDealMemory } from "@/app/lib/mem0";
import type { DealFields } from "@/app/lib/types";

const OFFICE_ID = "00000000-0000-0000-0000-000000000001";
const AGENT_ID  = "00000000-0000-0000-0001-000000000002"; // Jerrod — Phase 2: derive from email match
const USER_ID   = "jerrod-hastings";

export const maxDuration = 60;

// Payload from Cloudflare Email Worker (no inline attachment)
interface InboundPayload {
  from: string;
  fromName: string;
  subject: string;
  storagePath?: string;
  pdfName?: string;
  hasPdf?: boolean;
}

async function sendEmail(to: string, subject: string, body: string) {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) {
    console.warn("[inbound] POSTMARK_SERVER_TOKEN not set — skipping email");
    return;
  }

  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify({
      From: "harriett@meetharriett.xyz",
      To: to,
      Subject: subject,
      TextBody: body,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`[inbound] Postmark send failed ${res.status}:`, err);
  } else {
    console.log(`[inbound] Postmark sent to ${to} — status ${res.status}`);
  }
}

function firstName(fromName: string): string {
  return fromName ? ` ${fromName.split(" ")[0]}` : "";
}

function formatDealSummary(deal: DealFields): string {
  const lines: string[] = [];

  lines.push("Here's what I found.");
  lines.push("");

  if (deal.address) {
    lines.push(
      `Property: ${deal.address}${deal.city ? `, ${deal.city}` : ""}${deal.state ? `, ${deal.state}` : ""}${deal.zip ? ` ${deal.zip}` : ""}`
    );
  }
  if (deal.sellers?.length) lines.push(`Seller(s): ${deal.sellers.join(", ")}`);
  if (deal.buyers?.length) lines.push(`Buyer(s): ${deal.buyers.join(", ")}`);
  if (deal.listingAgent) {
    lines.push(
      `Listing agent: ${deal.listingAgent}${deal.brokerage ? ` (${deal.brokerage})` : ""}`
    );
  }
  if (deal.listPrice) lines.push(`List price: $${deal.listPrice.toLocaleString()}`);
  if (deal.salePrice) lines.push(`Sale price: $${deal.salePrice.toLocaleString()}`);
  if (deal.closingDate) lines.push(`Closing date: ${deal.closingDate}`);
  if (deal.loanType) lines.push(`Loan type: ${deal.loanType}`);
  if (deal.earnestMoney) lines.push(`Earnest money: $${deal.earnestMoney.toLocaleString()}`);
  if (deal.sellerConcessions) lines.push(`Seller concessions: $${deal.sellerConcessions.toLocaleString()}`);

  const flags: string[] = [];
  if (deal.flags?.leadPaintDisclosure) flags.push("Lead-based paint disclosure required (pre-1978 property)");
  if (deal.flags?.fhaLoan) flags.push("FHA loan — Amendatory Clause required");
  if (deal.flags?.loanTypeChanged) flags.push("Loan type changed mid-transaction — re-execute FHA Amendatory Clause");
  if (deal.flags?.recadRequired) flags.push("RECAD agency disclosure required");

  if (flags.length) {
    lines.push("");
    lines.push("Compliance flags:");
    flags.forEach((f) => lines.push(`- ${f}`));
  }

  lines.push("");
  lines.push("I've loaded this deal into my memory. Text me if you have questions.");
  lines.push("");
  lines.push("Harriett");

  return lines.join("\n");
}

async function processAndFollowUp(
  from: string,
  fromName: string,
  subject: string,
  storagePath: string,
  pdfName: string
) {
  const sb = getSupabaseServer();

  let pdfBase64: string;
  try {
    const { data, error } = await sb.storage.from("pdf-uploads").download(storagePath);
    if (error || !data) throw new Error(error?.message ?? "Download failed");
    const arrayBuffer = await data.arrayBuffer();
    pdfBase64 = Buffer.from(arrayBuffer).toString("base64");
  } catch (err) {
    console.error("[inbound] storage download error:", err);
    await sendEmail(
      from,
      `Re: ${subject || "Your document"}`,
      `Hi${firstName(fromName)},\n\nI had trouble accessing that PDF. Try again or reach out to Matt if this keeps happening.\n\nHarriett`
    );
    return;
  } finally {
    // Clean up regardless of parse outcome
    await sb.storage.from("pdf-uploads").remove([storagePath]);
  }

  let deal: DealFields;
  try {
    const raw = await callClaudeWithPdf(PARSE_SYSTEM, pdfBase64, 4096);
    deal = JSON.parse(raw);
  } catch (err) {
    console.error("[inbound] parse error:", err);
    await sendEmail(
      from,
      `Re: ${subject || "Your document"}`,
      `Hi${firstName(fromName)},\n\nI had trouble reading that PDF. Make sure it's a completed listing agreement or purchase contract (not a blank template) and try again.\n\nHarriett`
    );
    return;
  }

  const isBlank =
    !deal.address ||
    deal.address.trim() === "" ||
    (!deal.listPrice && !deal.salePrice) ||
    !Array.isArray(deal.sellers) ||
    deal.sellers.length === 0;

  if (isBlank) {
    await sendEmail(
      from,
      `Re: ${subject || "Your document"}`,
      `Hi${firstName(fromName)},\n\nThat looks like a blank template. Send me a completed, signed listing agreement or purchase contract and I'll pull the details.\n\nHarriett`
    );
    return;
  }

  const replySubject = deal.address ? `Re: ${deal.address}` : `Re: ${subject || "Your document"}`;
  const summary = formatDealSummary(deal);

  // Compute all dated milestones from deal data + Alabama rules
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://harriett-demo.vercel.app";

  function addDays(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d + days);
    return [
      dt.getFullYear(),
      String(dt.getMonth() + 1).padStart(2, "0"),
      String(dt.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function sendInvite(payload: object) {
    return fetch(`${baseUrl}/api/calendar/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: from, toName: fromName, ...payload }),
    });
  }

  const milestones: Promise<unknown>[] = [];
  const price = `$${(deal.salePrice ?? deal.listPrice)?.toLocaleString() ?? "TBD"}`;

  if (deal.closingDate) {
    // Closing
    milestones.push(sendInvite({
      eventType: "Closing",
      address: deal.address,
      date: deal.closingDate,
      description: `Closing for ${deal.address}. Sale price: ${price}. Sellers: ${deal.sellers.join(", ")}. Buyers: ${deal.buyers.join(", ")}. Loan type: ${deal.loanType ?? "unknown"}. Coordinated by Harriett.`,
      location: deal.address,
    }));

    // Final walkthrough: 1 day before closing
    milestones.push(sendInvite({
      eventType: "Final Walkthrough",
      address: deal.address,
      date: addDays(deal.closingDate, -1),
      description: `Final walkthrough window for ${deal.address} — verify condition before closing on ${deal.closingDate}. Alabama buyer-beware: buyer arranges and attends.`,
      location: deal.address,
    }));
  }

  // Lead paint inspection: federal 10-day window from contract (use listingDate as proxy)
  if (deal.flags.leadPaintDisclosure && deal.listingDate) {
    const lpEnd = addDays(deal.listingDate, 10);
    milestones.push(sendInvite({
      eventType: "Lead Paint Inspection Deadline",
      address: deal.address,
      date: deal.listingDate,
      endDate: lpEnd,
      description: `Federal 10-day lead paint inspection window for ${deal.address} (pre-1978 property). Buyer's right to inspect and negotiate expires ${lpEnd}. Disclosure already executed.`,
    }));
  }

  // Loan commitment: ~21 days from listing date (estimated — confirm with lender)
  if (
    deal.listingDate &&
    deal.loanType &&
    !deal.loanType.toLowerCase().includes("cash")
  ) {
    milestones.push(sendInvite({
      eventType: "Loan Commitment Deadline",
      address: deal.address,
      date: addDays(deal.listingDate, 21),
      description: `Estimated loan commitment deadline — ${deal.loanType} loan for ${deal.address}. Confirm exact date with lender: ${deal.loanType.toUpperCase().includes("FHA") ? "First Federal Bank ISAOA" : "lender on file"}. Harriett will flag if not received.`,
    }));
  }

  // FHA Amendatory Clause re-execution reminder (if loan type changed)
  if (deal.flags.loanTypeChanged && deal.listingDate) {
    milestones.push(sendInvite({
      eventType: "FHA Amendatory Clause — Re-execute",
      address: deal.address,
      date: addDays(deal.listingDate, 1),
      description: `Loan type changed to FHA mid-transaction for ${deal.address}. FHA Amendatory Clause must be re-executed by all parties. Confirm with title company before closing.`,
    }));
  }

  const sb2 = getSupabaseServer();
  await Promise.all([
    sendEmail(from, replySubject, summary),
    seedDealMemory(deal, USER_ID),
    ...milestones,
    sb2.from("messages").insert({
      office_id:       OFFICE_ID,
      agent_id:        AGENT_ID,
      direction:       "inbound",
      channel:         "email",
      body:            `[PDF: ${pdfName}] ${subject}`,
      status:          "approved",
      harriett_action: "email_contract_received",
    }),
    sb2.from("messages").insert({
      office_id:       OFFICE_ID,
      agent_id:        AGENT_ID,
      direction:       "outbound",
      channel:         "email",
      body:            summary,
      status:          "sent",
      harriett_action: "email_deal_summary",
    }),
  ]);
}

export async function POST(req: NextRequest) {
  let payload: InboundPayload;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { from, fromName = "", subject = "", storagePath, pdfName = "document.pdf", hasPdf } = payload;

  // No PDF attached
  if (hasPdf === false || !storagePath) {
    await sendEmail(
      from,
      `Re: ${subject || "Your email"}`,
      `Hi${firstName(fromName)},\n\nI didn't find a PDF attached. Reply with the listing agreement or contract as a PDF and I'll take it from there.\n\nHarriett`
    );
    return NextResponse.json({ status: "no_pdf" });
  }

  // Acknowledge immediately
  await sendEmail(
    from,
    `Re: ${subject || "Your email"}`,
    `Hi${firstName(fromName)},\n\nGot it. I'm reading ${pdfName} now and will pull the deal details, check the compliance flags, and send you a summary in a moment.\n\nHarriett`
  );

  // Parse and follow up after response is sent
  after(async () => {
    await processAndFollowUp(from, fromName, subject, storagePath, pdfName);
  });

  return NextResponse.json({ status: "acknowledged" });
}
