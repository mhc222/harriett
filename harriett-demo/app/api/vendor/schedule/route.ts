import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/app/lib/claude";
import { VENDOR_SCHEDULE_SYSTEM } from "@/app/lib/prompts";
import type { VendorScheduleOutput } from "@/app/lib/types";

export const maxDuration = 60;

const SERVICE_LABELS: Record<string, string> = {
  photographer: "Schedule property photo shoot for the listing",
  inspector: "Schedule a home inspection per the contract inspection contingency",
  title: "Notify of upcoming closing and coordinate title work",
  appraiser: "Schedule a property appraisal",
  deed: "Request deed preparation for closing",
  other: "Coordinate services for an upcoming transaction",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vendor, deal, proposedDates } = body as {
      vendor: { name: string; contact: string; phone: string; email?: string; category: string };
      deal: { address: string; city: string; closingDate: string; agent: string };
      proposedDates: string[];
    };

    const serviceLabel = SERVICE_LABELS[vendor.category] ?? SERVICE_LABELS.other;

    const context = `
Vendor: ${vendor.name}
Contact: ${vendor.contact}
Phone: ${vendor.phone}
${vendor.email ? `Email: ${vendor.email}` : ""}

Property: ${deal.address}, ${deal.city}
Closing date: ${deal.closingDate}
Listing agent: ${deal.agent}, Pritchett-Moore Real Estate, Tuscaloosa AL

Service needed: ${serviceLabel}
Proposed available dates: ${proposedDates.length ? proposedDates.join(", ") : "as soon as possible"}
    `.trim();

    const raw = await callClaude(VENDOR_SCHEDULE_SYSTEM, context);
    const output: VendorScheduleOutput = JSON.parse(raw);
    return NextResponse.json(output);
  } catch (e) {
    console.error("Vendor schedule error:", e);
    return NextResponse.json({ error: "Failed to draft vendor outreach" }, { status: 500 });
  }
}
