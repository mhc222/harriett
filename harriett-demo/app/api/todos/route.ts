import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/app/lib/supabase";

const OFFICE_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("checklist_items")
    .select("id, category, title, detail, required, completed, deal_id")
    .eq("office_id", OFFICE_ID)
    .eq("completed", false)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) return NextResponse.json({ todos: [] });

  const todos = (data ?? []).map((row) => ({
    id: row.id as string,
    text: row.title as string,
    sub: (row.detail as string) ?? "",
    category: row.category as string,
    required: row.required as boolean,
    urgent: row.category === "closing" || row.required === true,
    roleFor: "agent" as const,
  }));

  return NextResponse.json({ todos });
}
