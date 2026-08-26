import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ConversationEventName,
  ConversationLane,
  ConversationTurnStatus,
} from "@/lib/contracts/conversation";

export interface ConversationTrace {
  id: string;
  correlationId: string;
  replay: boolean;
}

export async function startConversationTrace(
  db: SupabaseClient,
  input: {
    officeId: string;
    agentId: string;
    threadId?: string;
    inboundMessageId?: string;
    channel: "pwa" | "sms" | "whatsapp" | "rcs" | "email_event" | "voice";
    lane: ConversationLane;
    intent?: string;
    idempotencyKey: string;
  }
): Promise<ConversationTrace> {
  const { data: existing, error: lookupError } = await db
    .from("conversation_turns")
    .select("id, correlation_id")
    .eq("office_id", input.officeId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (lookupError) throw new Error(`conversation trace lookup failed: ${lookupError.message}`);
  if (existing) {
    return { id: existing.id, correlationId: existing.correlation_id, replay: true };
  }

  const { data: created, error: insertError } = await db
    .from("conversation_turns")
    .insert({
      office_id: input.officeId,
      agent_id: input.agentId,
      thread_id: input.threadId ?? null,
      inbound_message_id: input.inboundMessageId ?? null,
      channel: input.channel,
      lane: input.lane,
      intent: input.intent ?? null,
      status: "received",
      idempotency_key: input.idempotencyKey,
    })
    .select("id, correlation_id")
    .single();
  if (insertError || !created) {
    throw new Error(`conversation trace start failed: ${insertError?.message}`);
  }

  await recordConversationEvent(db, {
    officeId: input.officeId,
    turnId: created.id,
    event: "message.received",
    payload: { channel: input.channel },
  });
  return { id: created.id, correlationId: created.correlation_id, replay: false };
}

export async function recordConversationEvent(
  db: SupabaseClient,
  input: {
    officeId: string;
    turnId: string;
    event: ConversationEventName;
    durationMs?: number;
    payload?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await db.from("conversation_events").insert({
    office_id: input.officeId,
    turn_id: input.turnId,
    event: input.event,
    duration_ms: input.durationMs ?? null,
    payload: input.payload ?? null,
  });
  if (error) throw new Error(`conversation event ${input.event} failed: ${error.message}`);
}

export async function updateConversationTrace(
  db: SupabaseClient,
  input: {
    turnId: string;
    status: ConversationTurnStatus;
    outboundMessageId?: string;
    aiRunId?: string;
    workflowRunId?: string;
    timestampField?:
      | "first_feedback_at"
      | "first_token_at"
      | "reply_created_at"
      | "provider_accepted_at"
      | "delivered_at"
      | "completed_at";
    errorCode?: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const changes: Record<string, unknown> = {
    status: input.status,
    updated_at: now,
  };
  if (input.outboundMessageId) changes.outbound_message_id = input.outboundMessageId;
  if (input.aiRunId) changes.ai_run_id = input.aiRunId;
  if (input.workflowRunId) changes.workflow_run_id = input.workflowRunId;
  if (input.timestampField) changes[input.timestampField] = now;
  if (input.errorCode) changes.error_code = input.errorCode;

  const { error } = await db.from("conversation_turns").update(changes).eq("id", input.turnId);
  if (error) throw new Error(`conversation trace update failed: ${error.message}`);
}
