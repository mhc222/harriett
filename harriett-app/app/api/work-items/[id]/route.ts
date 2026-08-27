import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedContext } from "@/lib/auth-context";
import { writeAudit } from "@/lib/audit";
import { createUserClient } from "@/lib/db/server";

const UpdateSchema = z.object({
  status: z.enum(["open", "in_progress", "waiting", "completed", "cancelled"]),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid work item status" }, { status: 400 });
  const { id } = await context.params;
  const now = new Date().toISOString();
  const { data: item, error } = await db.from("work_items").update({
    status: parsed.data.status,
    completed_at: parsed.data.status === "completed" ? now : null,
    updated_at: now,
  }).eq("id", id).select("id,deal_id,title,status").maybeSingle();
  if (error) return NextResponse.json({ error: "work item could not be updated" }, { status: 500 });
  if (!item) return NextResponse.json({ error: "work item not found" }, { status: 404 });
  await writeAudit(db, {
    officeId: auth.officeId,
    actor: "user",
    actorId: auth.user.id,
    agentId: auth.agentId,
    dealId: item.deal_id ?? undefined,
    action: "task.status_changed",
    payload: { workItemId: item.id, title: item.title, status: item.status },
  });
  return NextResponse.json({ ok: true, item });
}
