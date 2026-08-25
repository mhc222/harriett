import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";

const QuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});

export async function GET(request: NextRequest) {
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = QuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") || undefined,
    limit: request.nextUrl.searchParams.get("limit") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid research query", issues: parsed.error.issues }, { status: 400 });
  }

  let query = db
    .from("property_research_runs")
    .select("id, research_type, provider, status, summary, confidence_flags, provider_call_count, source_observed_at, created_at, properties!inner(id, formatted_address, city, state, property_type)")
    .order("created_at", { ascending: false })
    .limit(parsed.data.limit);
  if (parsed.data.q) {
    query = query.ilike("properties.formatted_address", `%${parsed.data.q}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "research history could not be loaded" }, { status: 500 });
  }
  return NextResponse.json({ research: data ?? [] });
}
