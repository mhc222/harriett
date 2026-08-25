import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";

const IdSchema = z.string().uuid();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = IdSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "invalid research id" }, { status: 400 });

  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [{ data: research, error }, { data: artifacts }] = await Promise.all([
    db
      .from("property_research_runs")
      .select("*, properties(*)")
      .eq("id", id.data)
      .single(),
    db
      .from("artifacts")
      .select("id, kind, title, status, version, plain_text, content, created_at, updated_at")
      .eq("source_research_run_id", id.data)
      .order("created_at", { ascending: false }),
  ]);
  if (error || !research) {
    return NextResponse.json({ error: "research was not found" }, { status: 404 });
  }
  return NextResponse.json({ research, artifacts: artifacts ?? [] });
}
