import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/app/lib/supabase";

const OFFICE_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("checklist_items")
    .select("id, category, title, detail, required, completed, deal_id, due_date")
    .eq("office_id", OFFICE_ID)
    .eq("completed", false)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(30);

  if (error) return NextResponse.json({ todos: [] });

  const today = new Date().toISOString().split("T")[0];

  const todos = (data ?? []).map((row) => {
    const dueDate = row.due_date as string | null;
    const isOverdue  = dueDate != null && dueDate < today;
    const isDueToday = dueDate === today;

    return {
      id:       row.id as string,
      text:     row.title as string,
      sub:      (row.detail as string) ?? "",
      category: row.category as string,
      required: row.required as boolean,
      dueDate:  dueDate ?? undefined,
      urgent:   isOverdue || (row.category === "closing" && !isDueToday),
      roleFor:  "agent" as const,
    };
  });

  return NextResponse.json({ todos });
}
