import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/app/lib/supabase";

const OFFICE_ID = "00000000-0000-0000-0000-000000000001";
const AGENT_ID  = "00000000-0000-0000-0001-000000000002";

export async function GET() {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("deals")
    .select("id, parsed_fields")
    .eq("office_id", OFFICE_ID)
    .eq("agent_id", AGENT_ID)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data?.parsed_fields) {
    return NextResponse.json({ deal: null });
  }

  return NextResponse.json({ deal: data.parsed_fields });
}
