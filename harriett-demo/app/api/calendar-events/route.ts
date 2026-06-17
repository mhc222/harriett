import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/app/lib/supabase";

const OFFICE_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("calendar_events")
    .select("id, deal_id, title, date, type, address, note")
    .eq("office_id", OFFICE_ID)
    .gte("date", new Date().toISOString().split("T")[0])
    .order("date", { ascending: true })
    .limit(20);

  if (error) return NextResponse.json({ events: [] });

  const events = (data ?? []).map((row) => ({
    id:      row.id as string,
    date:    row.date as string,
    title:   row.title as string,
    address: (row.address ?? "") as string,
    agent:   "Jerrod Hastings",
    type:    row.type as "closing" | "inspection" | "deadline" | "appointment" | "listing",
    note:    row.note != null ? (row.note as string) : undefined,
  }));

  return NextResponse.json({ events });
}
