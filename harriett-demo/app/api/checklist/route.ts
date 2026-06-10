import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "../../lib/claude";

export const maxDuration = 60;
import { CHECKLIST_SYSTEM } from "../../lib/prompts";
import type { DealFields } from "../../lib/types";

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
    return NextResponse.json(result);
  } catch (err) {
    console.error("checklist error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checklist generation failed" },
      { status: 500 }
    );
  }
}
