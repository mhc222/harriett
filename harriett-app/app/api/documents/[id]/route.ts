import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";

const IdSchema = z.string().uuid();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = IdSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "invalid document id" }, { status: 400 });
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await db
    .from("documents")
    .select("id, deal_id, filename, parse_status, created_at")
    .eq("id", id.data)
    .single();
  if (error || !data) return NextResponse.json({ error: "document not found" }, { status: 404 });
  return NextResponse.json({
    documentId: data.id,
    dealId: data.deal_id,
    filename: data.filename,
    status: data.parse_status,
    createdAt: data.created_at,
  });
}
