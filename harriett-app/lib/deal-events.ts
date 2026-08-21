import type { DealFields } from "@/lib/contracts/deal";
import type { ChecklistOutput } from "@/lib/contracts/checklist";
import { addBusinessDays, addDays, leadPaintWindowEnd } from "./dates";
import { formatTimingRulesForPrompt, type TimingAnchor } from "./transaction-timing-rules";

interface Ids {
  officeId: string;
  dealId: string;
  agentId: string;
}

export interface CalendarEventRow {
  office_id: string;
  deal_id: string;
  agent_id: string;
  title: string;
  date: string;
  type: "closing" | "inspection" | "deadline" | "appointment" | "listing";
  address: string;
  note?: string;
}

// Pure row builders so the date logic is testable without a database.
export function buildCalendarEvents(deal: DealFields, ids: Ids): CalendarEventRow[] {
  const events: CalendarEventRow[] = [];
  const base = { office_id: ids.officeId, deal_id: ids.dealId, agent_id: ids.agentId };
  const addr = deal.address;

  if (deal.listingDate) {
    events.push({ ...base, title: "Listing Active", date: deal.listingDate, type: "listing", address: addr });
  }

  if (deal.closingDate) {
    events.push({
      ...base,
      title: "Closing",
      date: deal.closingDate,
      type: "closing",
      address: addr,
      note: `$${(deal.salePrice ?? deal.listPrice).toLocaleString()}`,
    });
  }

  // Lead paint window anchors on contract acceptance date, 10 calendar days.
  // The demo computed this from closing date; that was wrong.
  if (deal.flags.leadPaintDisclosure && deal.contractAcceptanceDate) {
    events.push({
      ...base,
      title: "Lead Paint 10-Day Window Ends",
      date: leadPaintWindowEnd(deal.contractAcceptanceDate),
      type: "deadline",
      address: addr,
      note: "Pre-1978 property. Federal 10-day inspection window from contract acceptance.",
    });
  }

  return events;
}

export interface ChecklistRow {
  office_id: string;
  deal_id: string;
  agent_id: string;
  category: string;
  title: string;
  detail: string | null;
  due_date: string | null;
  required: boolean;
}

function anchorDate(deal: DealFields, anchor: TimingAnchor): string | null {
  switch (anchor) {
    case "listing_date":
    case "mls_active_date":
      return deal.listingDate;
    case "contract_acceptance_date":
      return deal.contractAcceptanceDate;
    case "closing_date":
      return deal.closingDate;
    case "loan_application_date":
    case "loan_type_change_date":
    case "commission_ready_at":
      return null;
  }
}

function fallbackAnchorForCategory(
  deal: DealFields,
  category: ChecklistOutput["items"][number]["category"]
): string | null {
  if (category === "pre-listing" || category === "listing-active") {
    return deal.listingDate;
  }
  if (category === "under-contract") {
    return deal.contractAcceptanceDate;
  }
  if (category === "closing") {
    return deal.closingDate;
  }
  return null;
}

function dueDateForChecklistItem(
  deal: DealFields,
  item: ChecklistOutput["items"][number]
): string | null {
  if (item.dueDateAnchor) {
    const anchor = anchorDate(deal, item.dueDateAnchor);
    if (!anchor) return null;
    if (item.dueDateOffsetBusinessDays != null) {
      return addBusinessDays(anchor, item.dueDateOffsetBusinessDays);
    }
    if (item.dueDateOffsetDays != null) {
      return addDays(anchor, item.dueDateOffsetDays);
    }
    return anchor;
  }

  if (item.daysFromListing == null) return null;
  const anchor = fallbackAnchorForCategory(deal, item.category);
  return anchor ? addDays(anchor, item.daysFromListing) : null;
}

export function buildChecklistRows(
  output: ChecklistOutput,
  deal: DealFields,
  ids: Ids
): ChecklistRow[] {
  return output.items.map((item) => ({
    office_id: ids.officeId,
    deal_id: ids.dealId,
    agent_id: ids.agentId,
    category: item.category,
    title: item.title,
    detail: item.detail,
    due_date: dueDateForChecklistItem(deal, item),
    required: item.required,
  }));
}

export function checklistPrompt(deal: DealFields): string {
  return `Generate the transaction coordination checklist for this deal:

Property: ${deal.address}, ${deal.city}, ${deal.state} ${deal.zip}
Listing agent: ${deal.listingAgent}, ${deal.brokerage}
Sellers: ${deal.sellers.join(" and ")}
List price: $${deal.listPrice.toLocaleString()}
Listing date: ${deal.listingDate ?? "unknown"}
Contract acceptance: ${deal.contractAcceptanceDate ?? "none yet"}
Target close: ${deal.closingDate ?? "unknown"}
Property: ${deal.propertyType}${deal.bedBath ? `, ${deal.bedBath}` : ""}${deal.sqft ? `, ${deal.sqft} sq ft` : ""}${deal.yearBuilt ? `, built ${deal.yearBuilt}` : ""}
Loan type: ${deal.loanType ?? "unknown"}

Flags:
- Lead paint disclosure required: ${deal.flags.leadPaintDisclosure}
- RECAD required: ${deal.flags.recadRequired}
- Alabama buyer-beware: ${deal.flags.buyerBeware}
- FHA loan: ${deal.flags.fhaLoan}
- Loan type changed mid-transaction: ${deal.flags.loanTypeChanged}
- Relocation company involved: ${deal.flags.relocationCompany}

Timing rules to apply when relevant:
${formatTimingRulesForPrompt()}`;
}
