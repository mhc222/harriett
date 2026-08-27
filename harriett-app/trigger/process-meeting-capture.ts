import { openai } from "@ai-sdk/openai";
import { schemaTask } from "@trigger.dev/sdk";
import { transcribe } from "ai";
import { z } from "zod";
import { generateStructured } from "@/lib/ai/generate";
import { writeAudit } from "@/lib/audit";
import { MeetingSummarySchema } from "@/lib/contracts/operations";
import { createServiceClient } from "@/lib/db/server";
import {
  completeWorkflowTrace,
  failWorkflowTrace,
  recordWorkflowEvent,
} from "@/lib/execution-trace";

const MEETING_SUMMARY_INSTRUCTIONS = `You turn a real-estate professional's meeting recording or dictated memo into a concise operating summary.

Rules:
- Do not produce or repeat a transcript.
- Preserve names, dates, amounts, commitments, and stated preferences exactly when present.
- Separate explicit decisions from open questions.
- Make every next step concrete. Do not invent a due date or owner.
- Mark a contact fact as inferred unless the speaker stated it directly.
- Do not offer legal advice or claim a document is compliant.
- Use plain English. Do not use em dashes.`;

export const processMeetingCapture = schemaTask({
  id: "process-meeting-capture",
  schema: z.object({ meetingCaptureId: z.string().uuid() }),
  run: async ({ meetingCaptureId }) => {
    const db = createServiceClient();
    const { data: capture, error: captureError } = await db
      .from("meeting_captures")
      .select("id,office_id,agent_id,deal_id,property_id,contact_id,workflow_run_id,source_type,title,occurred_at,audio_storage_path,source_text,status")
      .eq("id", meetingCaptureId)
      .single();
    if (captureError || !capture) throw new Error(`meeting capture not found: ${captureError?.message}`);
    if (!capture.workflow_run_id) throw new Error("meeting capture is missing its workflow run");
    if (capture.status === "completed") return { meetingCaptureId, replay: true };

    const workflowRunId = capture.workflow_run_id as string;
    try {
      const startedAt = new Date().toISOString();
      const [{ error: captureStartError }, { error: workflowStartError }] = await Promise.all([
        db.from("meeting_captures").update({
          status: "processing",
          error_message: null,
          updated_at: startedAt,
        }).eq("id", capture.id),
        db.from("workflow_runs").update({
          status: "running",
          started_at: startedAt,
          updated_at: startedAt,
        }).eq("id", workflowRunId),
      ]);
      if (captureStartError) throw new Error(`meeting processing start failed: ${captureStartError.message}`);
      if (workflowStartError) throw new Error(`meeting workflow start failed: ${workflowStartError.message}`);
      await recordWorkflowEvent(db, capture.office_id, workflowRunId, "meeting.processing", {
        meetingCaptureId,
        sourceType: capture.source_type,
      });

      let sourceText = capture.source_text as string | null;
      let durationSeconds: number | null = null;
      if (["recording", "dictated_memo"].includes(capture.source_type)) {
        if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for meeting transcription");
        if (!capture.audio_storage_path) throw new Error("recording storage path is missing");
        const { data: recording, error: downloadError } = await db.storage
          .from("meeting-media")
          .download(capture.audio_storage_path);
        if (downloadError || !recording) throw new Error(`recording download failed: ${downloadError?.message}`);
        const result = await transcribe({
          model: openai.transcription(process.env.AI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe"),
          audio: new Uint8Array(await recording.arrayBuffer()),
        });
        sourceText = result.text;
        durationSeconds = result.durationInSeconds ?? null;
      }
      if (!sourceText?.trim()) throw new Error("meeting capture did not contain enough speech to summarize");

      const summary = await generateStructured({
        schema: MeetingSummarySchema,
        system: MEETING_SUMMARY_INSTRUCTIONS,
        content: JSON.stringify({
          suppliedTitle: capture.title,
          occurredAt: capture.occurred_at,
          sourceText,
        }),
        tier: "standard",
        maxOutputTokens: 4_000,
      });

      const { data: artifact, error: artifactError } = await db.from("artifacts").upsert({
        office_id: capture.office_id,
        agent_id: capture.agent_id,
        property_id: capture.property_id,
        deal_id: capture.deal_id,
        contact_id: capture.contact_id,
        workflow_run_id: workflowRunId,
        kind: "meeting_summary",
        title: summary.title,
        status: "ready_for_review",
        plain_text: summary.summary,
        content: {
          attendees: summary.attendees,
          topics: summary.topics,
          decisions: summary.decisions,
          next_steps: summary.nextSteps,
          follow_up_questions: summary.followUpQuestions,
          contact_facts: summary.contactFacts,
          source_type: capture.source_type,
          occurred_at: capture.occurred_at,
          transcript_retained: false,
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: "workflow_run_id" }).select("id").single();
      if (artifactError || !artifact) throw new Error(`meeting summary save failed: ${artifactError?.message}`);

      for (const [index, item] of summary.nextSteps.entries()) {
        const { error } = await db.from("work_items").upsert({
          office_id: capture.office_id,
          owner_agent_id: capture.agent_id,
          assigned_agent_id: capture.agent_id,
          property_id: capture.property_id,
          deal_id: capture.deal_id,
          contact_id: capture.contact_id,
          artifact_id: artifact.id,
          workflow_run_id: workflowRunId,
          workflow_step_key: `next-step-${index + 1}`,
          kind: "meeting_follow_up",
          title: item.title,
          detail: [item.detail, item.owner ? `Owner: ${item.owner}` : null].filter(Boolean).join("\n") || null,
          priority: item.priority,
          due_at: item.dueAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: "workflow_run_id,workflow_step_key" });
        if (error) throw new Error(`meeting follow-up save failed: ${error.message}`);
      }
      const expectedStepKeys = summary.nextSteps.map((_, index) => `next-step-${index + 1}`);
      const { data: existingWork } = await db.from("work_items")
        .select("id,workflow_step_key")
        .eq("workflow_run_id", workflowRunId);
      const staleIds = (existingWork ?? [])
        .filter((item) => item.workflow_step_key && !expectedStepKeys.includes(item.workflow_step_key))
        .map((item) => item.id);
      if (staleIds.length) {
        const { error } = await db.from("work_items").delete().in("id", staleIds);
        if (error) throw new Error(`stale meeting follow-up cleanup failed: ${error.message}`);
      }

      const completedAt = new Date().toISOString();
      const { error: updateError } = await db.from("meeting_captures").update({
        status: "completed",
        summary_artifact_id: artifact.id,
        source_text: null,
        duration_seconds: durationSeconds,
        completed_at: completedAt,
        updated_at: completedAt,
      }).eq("id", capture.id);
      if (updateError) throw new Error(`meeting capture completion failed: ${updateError.message}`);

      await completeWorkflowTrace(db, capture.office_id, workflowRunId, {
        meetingCaptureId,
        artifactId: artifact.id,
        followUpCount: summary.nextSteps.length,
        transcriptRetained: false,
      });
      await writeAudit(db, {
        officeId: capture.office_id,
        actor: "harriett",
        agentId: capture.agent_id,
        dealId: capture.deal_id ?? undefined,
        action: "meeting.summary_created",
        payload: {
          meetingCaptureId,
          artifactId: artifact.id,
          followUpCount: summary.nextSteps.length,
          sourceType: capture.source_type,
          transcriptRetained: false,
        },
      });
      return { meetingCaptureId, artifactId: artifact.id, followUpCount: summary.nextSteps.length };
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "meeting processing failed";
      await db.from("meeting_captures").update({
        status: "failed",
        error_message: message,
        updated_at: new Date().toISOString(),
      }).eq("id", capture.id);
      await failWorkflowTrace(db, capture.office_id, workflowRunId, error, { meetingCaptureId });
      await writeAudit(db, {
        officeId: capture.office_id,
        actor: "harriett",
        agentId: capture.agent_id,
        dealId: capture.deal_id ?? undefined,
        action: "meeting.processing_failed",
        payload: { meetingCaptureId, error: message },
      });
      throw error;
    }
  },
});
