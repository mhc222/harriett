import { schemaTask, tasks } from "@trigger.dev/sdk";
import { z } from "zod";
import { runAgentTurn } from "@/lib/ai/runtime";
import { routeConversationMessage } from "@/lib/ai/conversation-router";
import { writeAudit } from "@/lib/audit";
import { resolveDeterministicConversationResponse } from "@/lib/deterministic-conversation";
import { createServiceClient } from "@/lib/db/server";
import {
  completeWorkflowTrace,
  failWorkflowTrace,
  recordWorkflowEvent,
  startWorkflowTrace,
} from "@/lib/execution-trace";
import {
  recordConversationEvent,
  startConversationTrace,
  updateConversationTrace,
} from "@/lib/conversation-trace";
import type { processAgentMemory } from "@/trigger/process-agent-memory";
import { focusConversationContext } from "@/lib/conversation-context";

export const processAgentPwa = schemaTask({
  id: "process-agent-pwa",
  schema: z.object({
    messageId: z.string().uuid(),
    displayedAt: z.string().datetime().optional(),
  }),
  run: async ({ messageId, displayedAt }) => {
    const db = createServiceClient();
    const { data: inbound, error: inboundError } = await db
      .from("messages")
      .select("id, office_id, agent_id, deal_id, thread_id, direction, channel, body")
      .eq("id", messageId)
      .single();
    if (inboundError || !inbound) {
      throw new Error(`PWA message ${messageId} was not found: ${inboundError?.message}`);
    }
    if (inbound.direction !== "inbound" || inbound.channel !== "pwa") {
      throw new Error(`Message ${messageId} is not an inbound PWA message`);
    }

    const workflow = await startWorkflowTrace(db, {
      officeId: inbound.office_id,
      agentId: inbound.agent_id,
      dealId: inbound.deal_id ?? undefined,
      workflow: "agent_pwa_processing",
      version: "1.0.0",
      idempotencyKey: `pwa-message:${messageId}`,
      state: { inboundMessageId: messageId, channel: "pwa" },
    });
    await focusConversationContext(db, {
      officeId: inbound.office_id,
      agentId: inbound.agent_id,
      threadId: inbound.thread_id ?? undefined,
      patch: {
        activeWorkflowRunId: workflow.id,
        expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      },
    });

    let turnId: string | undefined;
    try {
      const deterministic = await resolveDeterministicConversationResponse(db, {
        officeId: inbound.office_id,
        agentId: inbound.agent_id,
        body: inbound.body,
      });
      const routed = routeConversationMessage(inbound.body);
      const lane = deterministic?.lane ?? routed.lane;
      const trace = await startConversationTrace(db, {
        officeId: inbound.office_id,
        agentId: inbound.agent_id,
        threadId: inbound.thread_id ?? undefined,
        inboundMessageId: messageId,
        channel: "pwa",
        lane,
        intent: deterministic?.intent ?? routed.intent,
        idempotencyKey: `pwa-message:${messageId}`,
      });
      turnId = trace.id;
      if (displayedAt) {
        const { error: displayedError } = await db
          .from("conversation_turns")
          .update({ first_token_at: displayedAt, updated_at: new Date().toISOString() })
          .eq("id", trace.id);
        if (displayedError) throw new Error(`PWA display timestamp failed: ${displayedError.message}`);
        await recordConversationEvent(db, {
          officeId: inbound.office_id,
          turnId: trace.id,
          event: "reply.displayed",
          payload: { channel: "pwa", displayedAt, delivery: "immediate_web_response" },
        });
      }
      await updateConversationTrace(db, {
        turnId: trace.id,
        status: "running",
        workflowRunId: workflow.id,
        timestampField: "first_feedback_at",
      });
      await recordConversationEvent(db, {
        officeId: inbound.office_id,
        turnId: trace.id,
        event: "turn.routed",
        payload: deterministic
          ? { lane, intent: deterministic.intent, reasonCode: deterministic.reasonCode }
          : { lane, intent: routed.intent, reasonCode: routed.reasonCode },
      });

      let response: string;
      let aiRunId: string | undefined;
      if (deterministic) {
        response = deterministic.response;
      } else {
        const result = await runAgentTurn({
          officeId: inbound.office_id,
          agentId: inbound.agent_id,
          channel: "pwa",
          message: inbound.body,
          conversationId: inbound.thread_id ?? undefined,
        }, { db });
        response = result.response;
        aiRunId = result.runId;
      }

      const { data: outbound, error: outboundError } = await db
        .from("messages")
        .insert({
          office_id: inbound.office_id,
          thread_id: inbound.thread_id,
          deal_id: inbound.deal_id,
          agent_id: inbound.agent_id,
          direction: "outbound",
          channel: "pwa",
          body: response,
          consumer_facing: false,
          status: "delivered",
          in_reply_to_id: messageId,
          ai_run_id: aiRunId ?? null,
          sent_at: new Date().toISOString(),
        })
        .select("id, created_at")
        .single();
      if (outboundError || !outbound) {
        throw new Error(`PWA reply persistence failed: ${outboundError?.message}`);
      }

      await updateConversationTrace(db, {
        turnId: trace.id,
        status: "completed",
        outboundMessageId: outbound.id,
        aiRunId,
        timestampField: "completed_at",
      });
      await recordConversationEvent(db, {
        officeId: inbound.office_id,
        turnId: trace.id,
        event: "reply.created",
        payload: { outboundMessageId: outbound.id, channel: "pwa" },
      });
      await recordConversationEvent(db, {
        officeId: inbound.office_id,
        turnId: trace.id,
        event: "turn.completed",
        payload: { outcome: deterministic?.outcome ?? "agent_runtime" },
      });
      await recordWorkflowEvent(db, inbound.office_id, workflow.id, "message.reply_saved", {
        inboundMessageId: messageId,
        outboundMessageId: outbound.id,
        aiRunId: aiRunId ?? null,
      });
      await writeAudit(db, {
        officeId: inbound.office_id,
        actor: "harriett",
        agentId: inbound.agent_id,
        dealId: inbound.deal_id ?? undefined,
        action: "pwa.reply_completed",
        payload: {
          inboundMessageId: messageId,
          outboundMessageId: outbound.id,
          workflowRunId: workflow.id,
          conversationTurnId: trace.id,
          aiRunId: aiRunId ?? null,
          lane,
        },
      });
      await completeWorkflowTrace(db, inbound.office_id, workflow.id, {
        inboundMessageId: messageId,
        outboundMessageId: outbound.id,
        aiRunId: aiRunId ?? null,
        outcome: "delivered_in_app",
      });

      if (aiRunId) {
        await tasks.trigger<typeof processAgentMemory>("process-agent-memory", {
          officeId: inbound.office_id,
          agentId: inbound.agent_id,
          messageId,
          aiRunId,
          channel: "pwa",
          agentMessage: inbound.body,
          assistantResponse: response,
        }, {
          idempotencyKey: ["agent-memory", messageId],
          idempotencyKeyTTL: "7d",
          concurrencyKey: inbound.agent_id,
        });
      }

      return {
        response,
        messageId: outbound.id as string,
        createdAt: outbound.created_at as string,
        runId: aiRunId ?? null,
        lane,
      };
    } catch (error) {
      if (turnId) {
        await updateConversationTrace(db, {
          turnId,
          status: "failed",
          errorCode: error instanceof Error ? error.name : "unknown",
        });
      }
      await writeAudit(db, {
        officeId: inbound.office_id,
        actor: "harriett",
        agentId: inbound.agent_id,
        action: "pwa.reply_failed",
        payload: { inboundMessageId: messageId, workflowRunId: workflow.id, error: String(error) },
      });
      await failWorkflowTrace(db, inbound.office_id, workflow.id, error, {
        inboundMessageId: messageId,
      });
      throw error;
    } finally {
      await focusConversationContext(db, {
        officeId: inbound.office_id,
        agentId: inbound.agent_id,
        threadId: inbound.thread_id ?? undefined,
        patch: { activeWorkflowRunId: null },
      });
    }
  },
});
