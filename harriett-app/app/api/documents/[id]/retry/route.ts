import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedContext } from "@/lib/auth-context";
import { writeAudit } from "@/lib/audit";
import { createUserClient } from "@/lib/db/server";
import type { parseDeal } from "@/trigger/parse-deal";

const IdSchema = z.string().uuid();

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = IdSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "invalid document id" }, { status: 400 });

  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: document, error } = await db
    .from("documents")
    .select("id, deal_id, filename, parse_status")
    .eq("id", id.data)
    .single();
  if (error || !document) return NextResponse.json({ error: "document not found" }, { status: 404 });
  if (document.deal_id) {
    return NextResponse.json({ error: "this document already belongs to a transaction", dealId: document.deal_id }, { status: 409 });
  }
  if (document.parse_status !== "failed") {
    return NextResponse.json({ error: "this document is already being reviewed" }, { status: 409 });
  }

  await writeAudit(db, {
    officeId: auth.officeId,
    actor: "user",
    actorId: auth.user.id,
    agentId: auth.agentId,
    action: "document.parse_retry_requested",
    payload: { documentId: document.id, filename: document.filename },
  });
  const run = await tasks.trigger<typeof parseDeal>("parse-deal", { documentId: document.id });
  return NextResponse.json({ documentId: document.id, runId: run.id }, { status: 202 });
}
