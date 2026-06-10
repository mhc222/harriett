import { NextRequest, NextResponse, after } from "next/server";
import { callClaudeWithPdf } from "@/app/lib/claude";
import { PARSE_SYSTEM } from "@/app/lib/prompts";
import { getSupabaseServer } from "@/app/lib/supabase";
import type { DealFields } from "@/app/lib/types";

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
  await sendEmail(from, replySubject, formatDealSummary(deal));
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
