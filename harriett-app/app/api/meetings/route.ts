import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedContext } from "@/lib/auth-context";
import { writeAudit } from "@/lib/audit";
import { createUserClient } from "@/lib/db/server";
import type { processMeetingCapture } from "@/trigger/process-meeting-capture";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const AUDIO_TYPES = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-m4a", "audio/ogg"]);

const MeetingInputSchema = z.object({
  sourceType: z.enum(["recording", "dictated_memo", "written_memo"]),
  title: z.string().trim().min(1).max(160),
  occurredAt: z.string().datetime({ offset: true }),
  dealId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  consentConfirmed: z.boolean(),
  memo: z.string().trim().max(15_000).optional(),
});

function audioExtension(type: string): string {
  if (type === "audio/mp4" || type === "audio/x-m4a") return "m4a";
  if (type === "audio/mpeg") return "mp3";
  if (type === "audio/wav") return "wav";
  if (type === "audio/ogg") return "ogg";
  return "webm";
}

function baseAudioType(type: string): string {
  return type.split(";", 1)[0].trim().toLowerCase();
}

export async function POST(request: Request) {
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.json({ error: "Your session expired. Sign in and try again." }, { status: 401 });

  const form = await request.formData();
  const parsed = MeetingInputSchema.safeParse({
    sourceType: form.get("sourceType"),
    title: form.get("title"),
    occurredAt: form.get("occurredAt"),
    dealId: form.get("dealId") || undefined,
    contactId: form.get("contactId") || undefined,
    consentConfirmed: form.get("consentConfirmed") === "true",
    memo: typeof form.get("memo") === "string" ? form.get("memo") : undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the title, date, and meeting details." }, { status: 400 });
  }
  const input = parsed.data;
  const file = form.get("audio");
  const hasAudio = file instanceof File && file.size > 0;
  if (["recording", "dictated_memo"].includes(input.sourceType)) {
    if (!hasAudio) return NextResponse.json({ error: "Record audio before saving this capture." }, { status: 400 });
    if (!AUDIO_TYPES.has(baseAudioType((file as File).type))) return NextResponse.json({ error: "This audio format is not supported." }, { status: 400 });
    if ((file as File).size > MAX_AUDIO_BYTES) return NextResponse.json({ error: "Recording exceeds 25MB." }, { status: 400 });
  }
  if (input.sourceType === "recording" && !input.consentConfirmed) {
    return NextResponse.json({ error: "Confirm everyone gave permission before uploading a meeting recording." }, { status: 400 });
  }
  if (input.sourceType === "written_memo" && (!input.memo || input.memo.length < 10)) {
    return NextResponse.json({ error: "Add a little more detail to the written memo." }, { status: 400 });
  }

  let propertyId: string | null = null;
  if (input.dealId) {
    const { data: deal } = await db.from("deals").select("property_id").eq("id", input.dealId).single();
    if (!deal) return NextResponse.json({ error: "That transaction could not be found." }, { status: 404 });
    propertyId = deal.property_id;
  }
  if (input.contactId) {
    const { data: contact } = await db.from("contacts").select("id").eq("id", input.contactId).single();
    if (!contact) return NextResponse.json({ error: "That contact could not be found." }, { status: 404 });
  }

  const idempotencyKey = `meeting:${auth.agentId}:${crypto.randomUUID()}`;
  const { data: workflowRun, error: workflowError } = await db.from("workflow_runs").insert({
    office_id: auth.officeId,
    agent_id: auth.agentId,
    deal_id: input.dealId ?? null,
    workflow: "meeting_capture",
    version: "1",
    status: "queued",
    state: { sourceType: input.sourceType, title: input.title },
    idempotency_key: idempotencyKey,
  }).select("id").single();
  if (workflowError || !workflowRun) {
    return NextResponse.json({ error: "The meeting job could not be started." }, { status: 500 });
  }

  let audioStoragePath: string | null = null;
  if (hasAudio) {
    const audioFile = file as File;
    const contentType = baseAudioType(audioFile.type);
    audioStoragePath = `${auth.officeId}/${auth.agentId}/${crypto.randomUUID()}.${audioExtension(contentType)}`;
    const { error: uploadError } = await db.storage.from("meeting-media").upload(audioStoragePath, audioFile, {
      contentType,
      upsert: false,
    });
    if (uploadError) {
      return NextResponse.json({ error: `Recording upload failed: ${uploadError.message}` }, { status: 500 });
    }
  }

  const { data: capture, error: captureError } = await db.from("meeting_captures").insert({
    office_id: auth.officeId,
    agent_id: auth.agentId,
    deal_id: input.dealId ?? null,
    property_id: propertyId,
    contact_id: input.contactId ?? null,
    workflow_run_id: workflowRun.id,
    source_type: input.sourceType,
    title: input.title,
    occurred_at: input.occurredAt,
    recording_consent_at: input.sourceType === "recording" ? new Date().toISOString() : null,
    audio_storage_path: audioStoragePath,
    audio_mime_type: hasAudio ? baseAudioType((file as File).type) : null,
    audio_size_bytes: hasAudio ? (file as File).size : null,
    source_text: input.sourceType === "written_memo" ? input.memo : null,
  }).select("id").single();
  if (captureError || !capture) {
    if (audioStoragePath) await db.storage.from("meeting-media").remove([audioStoragePath]);
    return NextResponse.json({ error: `Meeting record failed: ${captureError?.message}` }, { status: 500 });
  }

  await writeAudit(db, {
    officeId: auth.officeId,
    actor: "user",
    actorId: auth.user.id,
    agentId: auth.agentId,
    dealId: input.dealId,
    action: "meeting.capture_created",
    payload: {
      meetingCaptureId: capture.id,
      workflowRunId: workflowRun.id,
      sourceType: input.sourceType,
      consentConfirmed: input.sourceType === "recording" ? true : null,
    },
  });
  try {
    const run = await tasks.trigger<typeof processMeetingCapture>(
      "process-meeting-capture",
      { meetingCaptureId: capture.id },
      { idempotencyKey: `meeting-capture:${capture.id}`, idempotencyKeyTTL: "30d", concurrencyKey: auth.agentId }
    );
    const { error: linkError } = await db.from("meeting_captures").update({ trigger_run_id: run.id }).eq("id", capture.id);
    if (linkError) {
      await writeAudit(db, {
        officeId: auth.officeId,
        actor: "system",
        agentId: auth.agentId,
        dealId: input.dealId,
        action: "meeting.trigger_link_failed",
        payload: { meetingCaptureId: capture.id, workflowRunId: workflowRun.id, triggerRunId: run.id },
      });
    }
    return NextResponse.json({ ok: true, meetingCaptureId: capture.id, workflowRunId: workflowRun.id, runId: run.id }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "meeting dispatch failed";
    await Promise.all([
      db.from("meeting_captures").update({ status: "failed", error_message: message, updated_at: new Date().toISOString() }).eq("id", capture.id),
      db.from("workflow_runs").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", workflowRun.id),
    ]);
    await writeAudit(db, {
      officeId: auth.officeId,
      actor: "system",
      agentId: auth.agentId,
      dealId: input.dealId,
      action: "meeting.dispatch_failed",
      payload: { meetingCaptureId: capture.id, workflowRunId: workflowRun.id, error: message },
    });
    return NextResponse.json({ error: "The capture was saved, but processing could not start. Try again shortly." }, { status: 503 });
  }
}
