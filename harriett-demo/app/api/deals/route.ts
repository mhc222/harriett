import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/app/lib/supabase";

const OFFICE_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("deals")
    .select("id, address, city, status, list_price, sale_price, closing_date, listing_date, parsed_fields, agent_id")
    .eq("office_id", OFFICE_ID)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ deals: [] });

  const deals = (data ?? []).map((row) => {
    const pf = (row.parsed_fields ?? {}) as Record<string, unknown>;
    const flags = (pf.flags ?? {}) as Record<string, boolean>;

    // Map Supabase status to dashboard stage
    const stageMap: Record<string, string> = {
      listing_active: "listing-active",
      under_contract: "under-contract",
      closing:        "closing",
      closed:         "closed",
      pre_listing:    "listing-active",
    };
    const stage = stageMap[row.status] ?? "listing-active";

    // Derive urgent flags from parsed compliance data
    const urgentFlags: string[] = [];
    if (flags.leadPaintDisclosure) urgentFlags.push("Lead-based paint disclosure required");
    if (flags.loanTypeChanged)     urgentFlags.push("Loan type changed — new forms required");
    if (flags.fhaLoan)             urgentFlags.push("FHA Amendatory Clause required");

    // Format closing date
    const closingDate = row.closing_date
      ? new Date(row.closing_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "";

    return {
      id:            row.id as string,
      address:       row.address as string,
      city:          (row.city ?? "") as string,
      stage,
      agent:         (pf.listingAgent as string) ?? "Jerrod Hastings",
      price:         (row.sale_price ?? row.list_price ?? 0) as number,
      loanType:      (pf.loanType as string) ?? "Conventional",
      closingDate,
      urgentFlags,
      checklist:     { completed: 0, total: 8 },
      mlsEntered:    false,
      postcardSent:  false,
      folderLabel:   row.sale_price ? "white" : "blue",
    };
  });

  return NextResponse.json({ deals });
}
