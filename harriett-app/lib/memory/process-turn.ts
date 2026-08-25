import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAudit } from "@/lib/audit";
import { governMemoryCandidates, normalizeMemoryContent } from "@/lib/memory/governance";
import { extractWithMem0, mem0Configured, type RawMemoryCandidate } from "@/lib/memory/mem0-processor";
import { memoryMode, shouldActivateCandidate } from "@/lib/memory/mode";
import { SupabaseMemoryProvider } from "@/lib/memory/provider";

export interface ProcessMemoryTurnInput {
  officeId: string;
  agentId: string;
  messageId: string;
  aiRunId?: string;
  channel: "sms" | "whatsapp" | "pwa";
  agentMessage: string;
  assistantResponse: string;
}

export interface ProcessMemoryTurnResult {
  status: "completed" | "skipped";
  processor?: "mem0_oss" | "structured";
  candidatesFound: number;
  candidatesSaved: number;
  candidatesBlocked: number;
}

export async function processMemoryTurn(
  db: SupabaseClient,
  input: ProcessMemoryTurnInput
): Promise<ProcessMemoryTurnResult> {
  const mode = memoryMode();
  const { data: existing } = await db
    .from("memory_processing_runs")
    .select("status, processor, candidates_found, candidates_saved, candidates_blocked")
    .eq("message_id", input.messageId)
    .maybeSingle();
  if (existing?.status === "completed" || existing?.status === "skipped") {
    return {
      status: existing.status,
      processor: existing.processor ?? undefined,
      candidatesFound: existing.candidates_found,
      candidatesSaved: existing.candidates_saved,
      candidatesBlocked: existing.candidates_blocked,
    };
  }

  const { data: processingRun, error: processingError } = existing
    ? await db
        .from("memory_processing_runs")
        .update({ status: "running", error_code: null, error_message: null })
        .eq("message_id", input.messageId)
        .select("id")
        .single()
    : await db
        .from("memory_processing_runs")
        .insert({
          office_id: input.officeId,
          agent_id: input.agentId,
          message_id: input.messageId,
          ai_run_id: input.aiRunId ?? null,
          mode,
        })
        .select("id")
        .single();
  if (processingError || !processingRun) {
    throw new Error(`memory processing audit failed: ${processingError?.message}`);
  }

  if (mode === "disabled") {
    await db
      .from("memory_processing_runs")
      .update({ status: "skipped", completed_at: new Date().toISOString() })
      .eq("id", processingRun.id);
    return { status: "skipped", candidatesFound: 0, candidatesSaved: 0, candidatesBlocked: 0 };
  }

  let processor: "mem0_oss" | "structured" = "structured";
  let rawCandidates: RawMemoryCandidate[] = [];

  try {
    if (mem0Configured()) {
      rawCandidates = await extractWithMem0(input);
      processor = "mem0_oss";
    }

    const candidates = await governMemoryCandidates({
      agentMessage: input.agentMessage,
      assistantResponse: input.assistantResponse,
      proposed: rawCandidates,
    });
    const provider = new SupabaseMemoryProvider(db);
    let saved = 0;
    let blocked = 0;

    for (const [index, candidate] of candidates.entries()) {
      const normalized = normalizeMemoryContent(candidate.content);
      if (!normalized) continue;

      const [{ data: block }, { data: duplicate }] = await Promise.all([
        db
          .from("memory_blocks")
          .select("id")
          .eq("office_id", input.officeId)
          .eq("agent_id", input.agentId)
          .eq("normalized_content", normalized)
          .maybeSingle(),
        db
          .from("memories")
          .select("id")
          .eq("office_id", input.officeId)
          .eq("agent_id", input.agentId)
          .in("status", ["proposed", "active"])
          .eq("content", candidate.content)
          .maybeSingle(),
      ]);
      if (block) {
        blocked += 1;
        continue;
      }
      if (duplicate) continue;

      const raw = rawCandidates[index];
      if (raw?.id) {
        const { data: existingProcessorMemory } = await db
          .from("memories")
          .select("id")
          .eq("office_id", input.officeId)
          .eq("agent_id", input.agentId)
          .eq("processor", "mem0_oss")
          .eq("processor_memory_id", raw.id)
          .maybeSingle();
        if (existingProcessorMemory) continue;
      }

      const active = shouldActivateCandidate({
        mode,
        sensitivity: candidate.sensitivity,
        explicit: candidate.explicit,
        confidence: candidate.confidence,
      });
      const memory = await provider.save({
        officeId: input.officeId,
        agentId: input.agentId,
        scope: "agent",
        category: candidate.category,
        content: candidate.content,
        provenance: {
          source: input.channel,
          sourceId: input.messageId,
          explicit: candidate.explicit,
          observedAt: new Date().toISOString(),
        },
        confidence: candidate.confidence,
        status: active ? "active" : "proposed",
        sensitivity: candidate.sensitivity,
      });
      const { error: annotationError } = await db
        .from("memories")
        .update({
          processor,
          processor_memory_id: raw?.id ?? null,
          governance_reason: candidate.reason,
        })
        .eq("id", memory.id);
      if (annotationError) throw new Error(`memory annotation failed: ${annotationError.message}`);
      saved += 1;
    }

    const completedAt = new Date().toISOString();
    const { error: completionError } = await db
      .from("memory_processing_runs")
      .update({
        processor,
        status: "completed",
        candidates_found: candidates.length,
        candidates_saved: saved,
        candidates_blocked: blocked,
        completed_at: completedAt,
      })
      .eq("id", processingRun.id);
    if (completionError) throw new Error(`memory processing completion failed: ${completionError.message}`);
    await db.from("messages").update({ memory_processed_at: completedAt }).eq("id", input.messageId);
    await writeAudit(db, {
      officeId: input.officeId,
      actor: "harriett",
      agentId: input.agentId,
      action: "memory.shadow_processed",
      payload: {
        messageId: input.messageId,
        aiRunId: input.aiRunId,
        mode,
        processor,
        candidatesFound: candidates.length,
        candidatesSaved: saved,
        candidatesBlocked: blocked,
      },
    });
    return {
      status: "completed",
      processor,
      candidatesFound: candidates.length,
      candidatesSaved: saved,
      candidatesBlocked: blocked,
    };
  } catch (error) {
    await db
      .from("memory_processing_runs")
      .update({
        processor,
        status: "failed",
        error_code: error instanceof Error ? error.name : "unknown",
        error_message: error instanceof Error ? error.message.slice(0, 1_000) : String(error).slice(0, 1_000),
        completed_at: new Date().toISOString(),
      })
      .eq("id", processingRun.id);
    throw error;
  }
}
