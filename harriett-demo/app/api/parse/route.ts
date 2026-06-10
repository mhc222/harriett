import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithPdf } from "../../lib/claude";

export const maxDuration = 60;
import { PARSE_SYSTEM } from "../../lib/prompts";
import { DEMO_TRANSACTION } from "../../lib/demo-transaction";
import { getSupabaseServer } from "../../lib/supabase";
import { seedDealMemory } from "../../lib/mem0";
import type { DealFields } from "../../lib/types";

// Phase 1: single agent. Phase 2: derive from authenticated session.
const DEFAULT_USER_ID = "jerrod-hastings";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await request.json();

      if (body.demoMode) {
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

        await Promise.all([
          sb.storage.from("pdf-uploads").remove([body.storagePath]),
          seedDealMemory(deal, DEFAULT_USER_ID),
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
      await seedDealMemory(deal, DEFAULT_USER_ID);
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
