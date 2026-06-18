import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithPdf } from "../../lib/claude";

export const maxDuration = 120;
import { PARSE_SYSTEM } from "../../lib/prompts";
import { DEMO_TRANSACTION } from "../../lib/demo-transaction";
import { getSupabaseServer } from "../../lib/supabase";
import { seedDealMemory } from "../../lib/mem0";
import type { DealFields } from "../../lib/types";
import { writeCalendarEvents, generateAndSaveChecklist, OFFICE_ID, AGENT_ID } from "../../lib/deal-events";

// Phase 1: single agent. Phase 2: derive from authenticated session.
const DEFAULT_USER_ID = "jerrod-hastings";

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

  if (error) console.error("[parse] deal row write failed:", error.message);
  return data?.id ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await request.json();

      if (body.demoMode) {
        const demoDealId = await writeDealRow(DEMO_TRANSACTION, "manual");
        if (demoDealId) {
          await Promise.all([
            writeCalendarEvents(demoDealId, DEMO_TRANSACTION),
            generateAndSaveChecklist(demoDealId, DEMO_TRANSACTION),
          ]);
        }
        return NextResponse.json(DEMO_TRANSACTION);
      }

      // Large PDF path: client uploaded to Supabase Storage, sends us the path
      if (body.storagePath) {
        const sb = getSupabaseServer();
        const { data, error } = await sb.storage
          .from("pdf-uploads")
          .download(body.storagePath);

        if (error || !data) {
          throw new Error(error?.message ?? "Could not download PDF from storage");
        }

        const arrayBuffer = await data.arrayBuffer();
        const pdfBase64 = Buffer.from(arrayBuffer).toString("base64");
        const raw = await callClaudeWithPdf(PARSE_SYSTEM, pdfBase64);
        const deal: DealFields = JSON.parse(raw);

        const dealId = await writeDealRow(deal, "email_parse");
        await Promise.all([
          sb.storage.from("pdf-uploads").remove([body.storagePath]),
          seedDealMemory(deal, DEFAULT_USER_ID),
          dealId ? writeCalendarEvents(dealId, deal) : Promise.resolve(),
          dealId ? generateAndSaveChecklist(dealId, deal) : Promise.resolve(),
        ]);

        return NextResponse.json(deal);
      }

      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Small PDF path: direct multipart upload (under 4.5 MB)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      if (file.type !== "application/pdf") {
        return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdfBase64 = Buffer.from(arrayBuffer).toString("base64");
      const raw = await callClaudeWithPdf(PARSE_SYSTEM, pdfBase64);
      const deal: DealFields = JSON.parse(raw);
      const dealId = await writeDealRow(deal, "email_parse");
      await Promise.all([
        seedDealMemory(deal, DEFAULT_USER_ID),
        dealId ? writeCalendarEvents(dealId, deal) : Promise.resolve(),
        dealId ? generateAndSaveChecklist(dealId, deal) : Promise.resolve(),
      ]);
      return NextResponse.json(deal);
    }

    return NextResponse.json({ error: "Unsupported content type" }, { status: 415 });
  } catch (err) {
    console.error("parse error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Parse failed" },
      { status: 500 }
    );
  }
}
