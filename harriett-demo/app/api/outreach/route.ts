import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/app/lib/claude";

export const maxDuration = 60;
import { OUTREACH_SYSTEM } from "@/app/lib/prompts";
import type { DealFields, OutreachOutput } from "@/app/lib/types";

export async function POST(req: NextRequest) {
  try {
    const deal: DealFields = await req.json();

    const dealSummary = `
Property: ${deal.address}, ${deal.city}, ${deal.state} ${deal.zip}${deal.county ? ` (${deal.county} County)` : ""}
Agent: ${deal.listingAgent}, ${deal.brokerage}
Buyers: ${deal.buyers.join(", ")}
Sale Price: $${(deal.salePrice ?? deal.listPrice).toLocaleString()}
Earnest Money: ${deal.earnestMoney ? `$${deal.earnestMoney.toLocaleString()}` : "not recorded"}
Seller Concessions: ${deal.sellerConcessions ? `$${deal.sellerConcessions.toLocaleString()}` : "none"}
Listing Date: ${deal.listingDate}
Closing Date: ${deal.closingDate}
Loan Type: ${deal.loanType ?? "unknown"}
Appurtenances: ${deal.appurtenances.length ? deal.appurtenances.join(", ") : "none listed"}

Flags:
- Lead Paint Disclosure Required: ${deal.flags.leadPaintDisclosure}
- FHA Loan: ${deal.flags.fhaLoan}
- Loan Type Changed Mid-Transaction: ${deal.flags.loanTypeChanged}
- RECAD Required: ${deal.flags.recadRequired}
- Alabama Buyer-Beware: ${deal.flags.buyerBeware}
    `.trim();

    const raw = await callClaude(OUTREACH_SYSTEM, dealSummary);
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const output: OutreachOutput = JSON.parse(cleaned);
    return NextResponse.json(output);
  } catch (e) {
    console.error("Outreach error:", e);
    return NextResponse.json({ error: "Failed to generate outreach message" }, { status: 500 });
  }
}
