import { NextResponse } from "next/server";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk";
import { createUserClient } from "@/lib/db/server";
import { writeAudit } from "@/lib/audit";
import type { parseDeal } from "@/trigger/parse-deal";

const MAX_BYTES = 20 * 1024 * 1024;

const MetaSchema = z.object({
  docType: z
    .enum(["listing_agreement", "purchase_agreement", "net_sheet", "disclosure", "settlement", "other"])
    .default("other"),
});

export async function POST(request: Request) {
  const db = await createUserClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const meta = user.app_metadata as { office_id?: string; agent_id?: string };
  if (!meta.office_id || !meta.agent_id) {
    return NextResponse.json({ error: "account not linked to an office" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "only PDF documents are accepted" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file exceeds 20MB" }, { status: 400 });
  }
  const parsedMeta = MetaSchema.safeParse({ docType: form.get("docType") ?? undefined });
  if (!parsedMeta.success) {
    return NextResponse.json({ error: parsedMeta.error.message }, { status: 400 });
  }

  const storagePath = `${meta.office_id}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await db.storage
    .from("documents")
    .upload(storagePath, file, { contentType: "application/pdf" });
  if (uploadError) {
    return NextResponse.json({ error: `upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { data: doc, error: insertError } = await db
    .from("documents")
    .insert({
      office_id: meta.office_id,
      agent_id: meta.agent_id,
      storage_path: storagePath,
      filename: file.name,
      mime_type: file.type,
      doc_type: parsedMeta.data.docType,
      source: "upload",
    })
    .select("id")
    .single();
  if (insertError || !doc) {
    return NextResponse.json({ error: `document record failed: ${insertError?.message}` }, { status: 500 });
  }

  await writeAudit(db, {
    officeId: meta.office_id,
    actor: "user",
    actorId: user.id,
    agentId: meta.agent_id,
    action: "document.uploaded",
    payload: { documentId: doc.id, filename: file.name, docType: parsedMeta.data.docType },
  });

  const run = await tasks.trigger<typeof parseDeal>("parse-deal", { documentId: doc.id });

  return NextResponse.json({ documentId: doc.id, runId: run.id }, { status: 202 });
}
