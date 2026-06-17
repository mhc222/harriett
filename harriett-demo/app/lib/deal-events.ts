import { getSupabaseServer } from "./supabase";
import { callClaude } from "./claude";
import { CHECKLIST_SYSTEM } from "./prompts";
import type { DealFields } from "./types";

export const OFFICE_ID = "00000000-0000-0000-0000-000000000001";
export const AGENT_ID  = "00000000-0000-0000-0001-000000000002"; // Jerrod Hastings

export async function writeCalendarEvents(dealId: string, deal: DealFields): Promise<void> {
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
    if (error) console.error("[deal-events] calendar_events write failed:", error.message);
  }
}

export async function generateAndSaveChecklist(dealId: string, deal: DealFields): Promise<void> {
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

  const sb = getSupabaseServer();
  await sb.from("checklist_items").delete().eq("deal_id", dealId);

  const rows = (result.items ?? []).map((item: {
    category: string;
    title: string;
    detail?: string;
    daysFromListing?: number;
    required?: boolean;
  }) => ({
    office_id: OFFICE_ID,
    deal_id: dealId,
    agent_id: AGENT_ID,
    category: item.category,
    title: item.title,
    detail: item.detail ?? null,
    days_from_listing: item.daysFromListing ?? null,
    required: item.required ?? true,
  }));

  if (rows.length > 0) {
    const { error } = await sb.from("checklist_items").insert(rows);
    if (error) console.error("[deal-events] checklist_items write failed:", error.message);
  }
}
