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
    const price = deal.salePrice ?? deal.listPrice;
    events.push({
      ...base,
      title: "Closing",
      date: deal.closingDate,
      type: "closing",
      address: addr,
      note: price == null ? "Price not found in document" : `$${price.toLocaleString()}`,
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

export function buildStandardChecklist(deal: DealFields): ChecklistOutput {
  type Item = ChecklistOutput["items"][number];
  const items: Item[] = [];
  const add = (
    category: Item["category"],
    title: string,
    detail: string | null,
    dueDateAnchor: Item["dueDateAnchor"] = null,
    dueDateOffsetDays: number | null = null,
    dueDateOffsetBusinessDays: number | null = null,
    required = true
  ) => items.push({
    category,
    title,
    detail,
    dueDateAnchor,
    dueDateOffsetDays,
    dueDateOffsetBusinessDays,
    daysFromListing: null,
    required,
  });

  const hasListing = Boolean(deal.listingDate || deal.listPrice || deal.sellers.length);
  const hasContract = Boolean(deal.contractAcceptanceDate || deal.salePrice || deal.buyers.length);

  if (hasListing) {
    add("pre-listing", "Verify signed listing agreement", "Confirm signatures, dates, and required selections from the document review.");
    add("pre-listing", "Verify listing estimated net sheet", "A net sheet is required for every offer price.");
    add("pre-listing", "Verify PM RECAD disclosure", "Confirm the disclosure is present and complete before relying on it.");
    add("pre-listing", "Verify State RECAD notification", "Confirm the required agency notification is documented.");
    add("pre-listing", "Check dual or designated agency", "If designated single agency applies, Wilson Moore must approve it.", null, null, null, false);
    add("pre-listing", "Verify PM Exclusive Listing Form", null);
    add("pre-listing", "Collect lockbox and access codes", "Record the lockbox number, shackle code, and CBS code.");
    add("listing-active", "Receive and organize listing photos", "Upload approved photos to the coordinator workspace.", "listing_date", 0);
    add("listing-active", "Enter listing in MLS", "Verify facts against source documents before publishing.", "listing_date", 0);
    add("listing-active", "Send MLS link for review", "Email the listing agent and copy Wilson and Gail.", "listing_date", 0);
    add("listing-active", "Add listing to Agent News", null, "listing_date", 0);
    add("listing-active", "Log listing in Excel Master Listings", null, "listing_date", 0);
    add("listing-active", "Prepare blue physical-file label", null, "listing_date", 0);
    add("listing-active", "Prepare Just Listed postcard", "Use approved property facts and photos only.", "listing_date", 1);
  }

  if (hasContract) {
    add("under-contract", "Verify executed purchase agreement", "Review signatures, dates, selections, incorporated addenda, and page evidence.");
    add("under-contract", "Verify agency and RECAD file", "Resolve any missing or unclear agency documents before substantive consumer communication.");
    add("under-contract", "Verify current seller net sheet", "Confirm the net sheet matches the accepted offer price.");
    add("under-contract", "Confirm earnest money handling", "Hold funds until the agent confirms a contract, then route for approved deposit.", "contract_acceptance_date", 0);
    add("under-contract", "Add pending sale to Agent News", null, "contract_acceptance_date", 0);
    add("under-contract", "Prepare white physical-file label", "Place over the blue label when this was a PM listing.", "contract_acceptance_date", 0);
    add("under-contract", "Log sale in Excel Master Sales", null, "contract_acceptance_date", 0);
    add("under-contract", "Change MLS status to Pending", "Verify the effective contract status before changing MLS.", "contract_acceptance_date", 0);
    add("under-contract", "Upload final contract to Instanet", "Use the final executed packet approved by the agent.", "contract_acceptance_date", 0);
    add("under-contract", "Confirm title or closing attorney", "Record the responsible contact and delivery status.");
    add("under-contract", "Confirm lender and financing milestones", "Use contract and lender evidence, not assumed dates.");
    add("under-contract", "Track inspection and repair terms", "Use the contract terms and page evidence for exact deadlines.");
    add("under-contract", "Track appraisal requirements", "Confirm whether the contract or financing requires an appraisal.");
    if (deal.sellerConcessions != null) {
      add("under-contract", "Verify seller concessions", "Confirm the amount against the executed agreement and closing figures.");
    }
    if (deal.flags.leadPaintDisclosure) {
      add("under-contract", "Verify lead-based paint disclosure", "Confirm the applicable disclosure is present and complete.");
      add("under-contract", "Track lead-paint inspection window", "Federal 10-day window measured from contract acceptance.", "contract_acceptance_date", 10);
    }
    if (deal.flags.fhaLoan) {
      add("under-contract", "Verify FHA Amendatory Clause", "Confirm execution by all required parties.");
    }
    if (deal.flags.loanTypeChanged) {
      add("under-contract", "Re-execute FHA Amendatory Clause", "Required review after the documented loan-type change.");
    }
    if (deal.flags.relocationCompany) {
      add("under-contract", "Confirm relocation-company requirements", "Use the documented relocation instructions and approval path.");
    }
  }

  if (deal.closingDate || hasContract) {
    add("closing", "Check Closing Disclosure timing", "Confirm receipt and timing from verified lender or closing evidence.", "closing_date", null, -3);
    add("closing", "Confirm closing appointment details", "Verify time, location, attendees, and required identification.", "closing_date", -2);
    add("closing", "Review settlement statement", "Compare material amounts with the contract before filing.", "closing_date", -1);
    add("closing", "Record closed date in Excel Master Sales", null, "closing_date", 0);
    add("closing", "Email closing confirmation to Wilson", null, "closing_date", 0);
    add("closing", "Change MLS status to Sold", "Use verified closed status and final figures.", "closing_date", 0);
    add("closing", "Upload settlement statement to Instanet", null, "closing_date", 0);
    add("closing", "Prepare Just Sold postcards", "Use approved closed-sale facts.", "closing_date", 1);
    add("closing", "Send commission-check notification", "Notify the agent and copy Gail when the commission is ready.");
  }

  return { items };
}

export function checklistPrompt(deal: DealFields): string {
  return `Generate the transaction coordination checklist for this deal:

Property: ${deal.address}, ${deal.city}, ${deal.state} ${deal.zip}
Listing agent: ${deal.listingAgent}, ${deal.brokerage}
Sellers: ${deal.sellers.join(" and ")}
List price: ${deal.listPrice == null ? "not found in document" : `$${deal.listPrice.toLocaleString()}`}
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
