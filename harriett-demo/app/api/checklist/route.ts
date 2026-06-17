import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "../../lib/claude";

export const maxDuration = 60;
import { CHECKLIST_SYSTEM } from "../../lib/prompts";
import type { DealFields } from "../../lib/types";
import { getSupabaseServer } from "../../lib/supabase";
import { OFFICE_ID, AGENT_ID, generateAndSaveChecklist } from "../../lib/deal-events";

export async function POST(request: NextRequest) {
  try {
    const deal: DealFields = await request.json();

    const userMessage = `Generate the transaction coordination checklist for this deal:

Property: ${deal.address}, ${deal.city}, AL ${deal.zip}
Listing agent: ${deal.listingAgent}, ${deal.brokerage}
Sellers: ${deal.sellers.join(" and ")}
List price: $${deal.listPrice.toLocaleString()}
Listing date: ${deal.listingDate}
Target close: ${deal.closingDate}
Property: ${deal.propertyType}, ${deal.bedBath}${deal.sqft ? `, ${deal.sqft} sq ft` : ""}${deal.yearBuilt ? `, built ${deal.yearBuilt}` : ""}

Flags:
- Lead paint disclosure required: ${deal.flags.leadPaintDisclosure}
- RECAD required: ${deal.flags.recadRequired}
- Alabama buyer-beware: ${deal.flags.buyerBeware}
- Relocation company involved: ${deal.flags.relocationCompany}`;

    const raw = await callClaude(CHECKLIST_SYSTEM, userMessage, 4096);
    const result = JSON.parse(raw);

    // Persist to Supabase (non-fatal if it fails)
    try {
      const sb = getSupabaseServer();
      // Use most recent deal for this agent — avoids fragile address string matching
      const { data: dealRow } = await sb
        .from("deals")
        .select("id")
        .eq("agent_id", AGENT_ID)
        .eq("office_id", OFFICE_ID)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (dealRow?.id) {
        await sb.from("checklist_items").delete().eq("deal_id", dealRow.id);

        const anchorRaw = deal.listingDate ? new Date(deal.listingDate + "T12:00:00") : new Date();
        const todayD = new Date();
        const sevenDaysAgo = new Date(todayD.getTime() - 7 * 24 * 60 * 60 * 1000);
        const anchor = anchorRaw < sevenDaysAgo ? todayD : anchorRaw;

        const rows = (result.items ?? []).map((item: {
          category: string;
          title: string;
          detail?: string;
          daysFromListing?: number;
          required?: boolean;
        }) => {
          let dueDate: string | null = null;
          if (item.daysFromListing != null) {
            const d = new Date(anchor.getTime() + item.daysFromListing * 24 * 60 * 60 * 1000);
            dueDate = d.toISOString().split("T")[0];
          }
          return {
            office_id: OFFICE_ID,
            deal_id: dealRow.id,
            agent_id: AGENT_ID,
            category: item.category,
            title: item.title,
            detail: item.detail ?? null,
            days_from_listing: item.daysFromListing ?? null,
            due_date: dueDate,
            required: item.required ?? true,
          };
        });

        if (rows.length > 0) {
          const { error } = await sb.from("checklist_items").insert(rows);
          if (error) console.error("[checklist] checklist_items write failed:", error.message);
        }
      }
    } catch (dbErr) {
      console.error("[checklist] Supabase write error:", dbErr);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("checklist error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checklist generation failed" },
      { status: 500 }
    );
  }
}
