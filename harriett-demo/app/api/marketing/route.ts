import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "../../lib/claude";

export const maxDuration = 60;
import { MARKETING_SYSTEM } from "../../lib/prompts";
import type { DealFields } from "../../lib/types";

export async function POST(request: NextRequest) {
  try {
    const deal: DealFields = await request.json();

    const userMessage = `Generate marketing materials for this listing:

Property: ${deal.address}, ${deal.city}, AL ${deal.zip}
List price: $${deal.listPrice.toLocaleString()}
Type: ${deal.propertyType}, ${deal.bedBath}${deal.sqft ? `, ${deal.sqft} sq ft` : ""}${deal.yearBuilt ? `, built ${deal.yearBuilt}` : ""}
Sellers: ${deal.sellers.join(" and ")}
Listing agent: ${deal.listingAgent}, ${deal.brokerage}
Target close: ${deal.closingDate}

Context: Pritchett-Moore Real Estate is an independent brokerage in Tuscaloosa, AL with deep local roots. The listing agent has local market expertise. Tuscaloosa is home to the University of Alabama.

Write the MLS remarks (800 char max), a Facebook post, and the listing presentation talking points.`;

    const raw = await callClaude(MARKETING_SYSTEM, userMessage);
    const result = JSON.parse(raw);

    // Enforce MLS char limit
    if (result.mlsRemarks && result.mlsRemarks.length > 800) {
      result.mlsRemarks = result.mlsRemarks.slice(0, 797) + "...";
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("marketing error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Marketing generation failed" },
      { status: 500 }
    );
  }
}
