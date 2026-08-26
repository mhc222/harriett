import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { authenticatedContext } from "@/lib/auth-context";
import { selectMetaPage } from "@/lib/connections/meta";
import { createUserClient } from "@/lib/db/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const pageId = z.string().trim().min(1).max(100).safeParse(form.get("pageId"));
  if (!pageId.success) return NextResponse.json({ error: "invalid Facebook Page" }, { status: 400 });
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.redirect(new URL("/login?next=%2Fconnections", request.url), 303);
  try {
    const connectionId = await selectMetaPage(db, pageId.data);
    await writeAudit(db, {
      officeId: auth.officeId,
      actor: "user",
      actorId: auth.user.id,
      agentId: auth.agentId,
      action: "connection.meta_page_selected",
      payload: { connectionId, pageId: pageId.data },
    });
    return NextResponse.redirect(new URL("/connections?meta=page_selected", request.url), 303);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Page selection failed" }, { status: 409 });
  }
}
