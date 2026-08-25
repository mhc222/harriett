import { schemaTask, tasks } from "@trigger.dev/sdk";
import { z } from "zod";
import { createServiceClient } from "@/lib/db/server";
import { writeAudit } from "@/lib/audit";
import { formatAgentMessageForChannel } from "@/lib/ai/message-format";
import { runAgentTurn } from "@/lib/ai/runtime";
import { sendAgentMessage, messageDeliveryMode, type AgentMessagingChannel } from "@/lib/sms";
import type { processAgentMemory } from "@/trigger/process-agent-memory";

export const processAgentSms = schemaTask({
  id: "process-agent-sms",
  schema: z.object({ messageId: z.string().uuid() }),
  run: async ({ messageId }) => {
    const db = createServiceClient();
    const { data: inbound, error: inboundError } = await db
      .from("messages")
      .select("id, office_id, agent_id, deal_id, thread_id, direction, channel, body, ai_run_id, created_at")
      .eq("id", messageId)
      .single();
    if (inboundError || !inbound) {
      throw new Error(`inbound message ${messageId} not found: ${inboundError?.message}`);
    }
    const channel = inbound.channel as AgentMessagingChannel;
    if (inbound.direction !== "inbound" || !["sms", "whatsapp"].includes(channel)) {
      throw new Error(`message ${messageId} is not an inbound agent message`);
    }

    if (messageDeliveryMode(channel) === "disabled") {
      await writeAudit(db, {
        officeId: inbound.office_id,
        actor: "system",
        agentId: inbound.agent_id,
        dealId: inbound.deal_id ?? undefined,
        action: `${channel}.reply_skipped_disabled`,
        payload: { inboundMessageId: messageId },
      });
      return { sent: false, reason: "disabled" as const };
    }

    const { data: existingReply } = await db
      .from("messages")
      .select("id, body, provider_message_id, status")
      .eq("in_reply_to_id", messageId)
      .maybeSingle();
    if (existingReply?.provider_message_id || (existingReply && existingReply.status !== "failed")) {
      await tasks.trigger<typeof processAgentMemory>(
        "process-agent-memory",
        {
          officeId: inbound.office_id,
          agentId: inbound.agent_id,
          messageId,
          aiRunId: inbound.ai_run_id ?? undefined,
          channel,
          agentMessage: inbound.body,
          assistantResponse: existingReply.body,
        },
        {
          idempotencyKey: ["agent-memory", messageId],
          idempotencyKeyTTL: "7d",
          concurrencyKey: inbound.agent_id,
        }
      );
      return {
        sent: true,
        messageId: existingReply.id,
        providerMessageId: existingReply.provider_message_id ?? undefined,
        dryRun: !existingReply.provider_message_id,
        duplicate: true,
      };
    }

    try {
      const turn = await runAgentTurn({
        officeId: inbound.office_id,
        agentId: inbound.agent_id,
        channel,
        message: inbound.body,
        conversationId: inbound.thread_id ?? undefined,
      }, {
        db,
      });
      const { error: linkError } = await db
        .from("messages")
        .update({ ai_run_id: turn.runId })
        .eq("id", messageId);
      if (linkError) throw new Error(`inbound AI run link failed: ${linkError.message}`);

      await writeAudit(db, {
        officeId: inbound.office_id,
        actor: "harriett",
        agentId: inbound.agent_id,
        dealId: inbound.deal_id ?? undefined,
        action: `${channel}.reply_generated`,
        payload: { inboundMessageId: messageId, aiRunId: turn.runId },
      });

      const replyBody = formatAgentMessageForChannel(turn.response, channel);
      const sent = await sendAgentMessage(db, {
        agentId: inbound.agent_id,
        channel,
        dealId: inbound.deal_id ?? undefined,
        inReplyToId: messageId,
        body: replyBody,
      });
      await tasks.trigger<typeof processAgentMemory>(
        "process-agent-memory",
        {
          officeId: inbound.office_id,
          agentId: inbound.agent_id,
          messageId,
          aiRunId: turn.runId,
          channel,
          agentMessage: inbound.body,
          assistantResponse: replyBody,
        },
        {
          idempotencyKey: ["agent-memory", messageId],
          idempotencyKeyTTL: "7d",
          concurrencyKey: inbound.agent_id,
        }
      );
      return { sent: true, ...sent };
    } catch (error) {
      await writeAudit(db, {
        officeId: inbound.office_id,
        actor: "harriett",
        agentId: inbound.agent_id,
        dealId: inbound.deal_id ?? undefined,
        action: `${channel}.reply_failed`,
        payload: { inboundMessageId: messageId, error: String(error) },
      });
      throw error;
    }
  },
});
