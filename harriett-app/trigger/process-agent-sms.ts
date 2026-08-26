import { schemaTask, tasks } from "@trigger.dev/sdk";
import { z } from "zod";
import { createServiceClient } from "@/lib/db/server";
import { writeAudit } from "@/lib/audit";
import {
  formatAgentMessageForChannel,
  formatFacebookDraftForWhatsApp,
  isFacebookDeleteCommand,
  isFacebookDraftCommand,
  isFacebookPublishApproval,
} from "@/lib/ai/message-format";
import { runAgentTurn } from "@/lib/ai/runtime";
import {
  approveLatestFacebookDraftFromConversation,
  createFacebookDraftFromConversation,
  deleteLatestFacebookPostFromConversation,
} from "@/lib/facebook-conversation";
import { sendAgentMessage, messageDeliveryMode, type AgentMessagingChannel } from "@/lib/sms";
import {
  completeWorkflowTrace,
  failWorkflowTrace,
  recordWorkflowEvent,
  startWorkflowTrace,
} from "@/lib/execution-trace";
import type { processAgentMemory } from "@/trigger/process-agent-memory";
import type { executeFacebookAction } from "@/trigger/facebook-actions";

const FacebookDraftSkillOutputSchema = z.object({
  title: z.string(),
  message: z.string(),
  reviewUrl: z.string().url(),
  primaryImageUrl: z.string().url().nullable(),
});

const FacebookPublishResultSchema = z.object({
  permalinkUrl: z.string().url().optional(),
  verificationStatus: z.enum(["graph_confirmed", "not_visible", "unverified"]).optional(),
}).passthrough();

const FacebookDeleteResultSchema = z.object({
  deleted: z.boolean().optional(),
  alreadyDeleted: z.boolean().optional(),
}).passthrough();

async function facebookDraftForRun(db: ReturnType<typeof createServiceClient>, aiRunId: string) {
  const { data, error } = await db.from("skill_runs")
    .select("output")
    .eq("ai_run_id", aiRunId)
    .eq("skill_name", "create_facebook_draft")
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Facebook draft result lookup failed: ${error.message}`);
  const parsed = FacebookDraftSkillOutputSchema.safeParse(data?.output);
  return parsed.success ? parsed.data : null;
}

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

    const workflow = await startWorkflowTrace(db, {
      officeId: inbound.office_id,
      agentId: inbound.agent_id,
      dealId: inbound.deal_id ?? undefined,
      workflow: "agent_message_processing",
      version: "1.0.0",
      idempotencyKey: `agent-message:${messageId}`,
      state: { inboundMessageId: messageId, channel },
    });
    let replySent = false;
    let aiRunId: string | undefined;
    try {
      if (messageDeliveryMode(channel) === "disabled") {
        await writeAudit(db, {
          officeId: inbound.office_id,
          actor: "system",
          agentId: inbound.agent_id,
          dealId: inbound.deal_id ?? undefined,
          action: `${channel}.reply_skipped_disabled`,
          payload: { inboundMessageId: messageId, workflowRunId: workflow.id },
        });
        await recordWorkflowEvent(db, inbound.office_id, workflow.id, "message.reply_disabled", {
          inboundMessageId: messageId,
          channel,
        });
        await completeWorkflowTrace(db, inbound.office_id, workflow.id, {
          inboundMessageId: messageId,
          channel,
          outcome: "disabled",
        });
        return { sent: false, reason: "disabled" as const, workflowRunId: workflow.id };
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
        await recordWorkflowEvent(db, inbound.office_id, workflow.id, "message.reply_reused", {
          inboundMessageId: messageId,
          outboundMessageId: existingReply.id,
        });
        await completeWorkflowTrace(db, inbound.office_id, workflow.id, {
          inboundMessageId: messageId,
          channel,
          aiRunId: inbound.ai_run_id,
          outboundMessageId: existingReply.id,
          outcome: "duplicate",
        });
        return {
          sent: true,
          messageId: existingReply.id,
          providerMessageId: existingReply.provider_message_id ?? undefined,
          dryRun: !existingReply.provider_message_id,
          duplicate: true,
          workflowRunId: workflow.id,
        };
      }

      const { data: lastOutbound } = await db
        .from("messages")
        .select("body,created_at")
        .eq("office_id", inbound.office_id)
        .eq("agent_id", inbound.agent_id)
        .eq("direction", "outbound")
        .in("channel", ["sms", "whatsapp"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const recentFacebookPostContext = Boolean(
        lastOutbound
        && Date.now() - new Date(lastOutbound.created_at).getTime() <= 30 * 60_000
        && /Facebook confirmed the post|facebook\.com\//i.test(lastOutbound.body)
      );

      if (isFacebookDeleteCommand(inbound.body, recentFacebookPostContext)) {
        try {
          const deletion = await deleteLatestFacebookPostFromConversation({
            db,
            officeId: inbound.office_id,
            agentId: inbound.agent_id,
          });
          if (deletion.status !== "completed") {
            const deleted = await tasks.triggerAndWait<typeof executeFacebookAction>(
              "execute-facebook-action",
              { actionRequestId: deletion.actionRequestId, action: "delete" },
              { idempotencyKey: ["facebook-delete", deletion.actionRequestId], idempotencyKeyTTL: "30d" },
            );
            const deletionResult = deleted.ok
              ? FacebookDeleteResultSchema.safeParse(deleted.output)
              : null;
            if (
              !deleted.ok
              || !deletionResult?.success
              || (!deletionResult.data.deleted && !deletionResult.data.alreadyDeleted)
            ) {
              throw new Error("Meta did not confirm the Facebook deletion");
            }
          }
          const sent = await sendAgentMessage(db, {
            agentId: inbound.agent_id,
            channel,
            dealId: inbound.deal_id ?? undefined,
            inReplyToId: messageId,
            body: `Deleted from ${deletion.pageName}. Facebook confirmed the post is no longer live.`,
          });
          replySent = true;
          await writeAudit(db, {
            officeId: inbound.office_id,
            actor: "harriett",
            agentId: inbound.agent_id,
            dealId: inbound.deal_id ?? undefined,
            action: "facebook.delete_confirmed_by_message",
            payload: {
              inboundMessageId: messageId,
              actionRequestId: deletion.actionRequestId,
              artifactId: deletion.artifactId,
              postId: deletion.postId,
              outboundMessageId: sent.messageId,
            },
          });
          await completeWorkflowTrace(db, inbound.office_id, workflow.id, {
            inboundMessageId: messageId,
            channel,
            actionRequestId: deletion.actionRequestId,
            outboundMessageId: sent.messageId,
            outcome: "facebook_deleted",
          });
          return { sent: true, ...sent, facebookDeleted: true, workflowRunId: workflow.id };
        } catch (error) {
          const detail = error instanceof Error ? error.message : "Facebook did not confirm the deletion.";
          const safeDetail = /^(I could not find|Facebook is not connected|The Facebook deletion)/.test(detail)
            ? detail
            : "Facebook did not confirm the deletion. The post remains in Harriett so you can try again.";
          const sent = await sendAgentMessage(db, {
            agentId: inbound.agent_id,
            channel,
            dealId: inbound.deal_id ?? undefined,
            inReplyToId: messageId,
            body: safeDetail,
          });
          replySent = true;
          await writeAudit(db, {
            officeId: inbound.office_id,
            actor: "harriett",
            agentId: inbound.agent_id,
            dealId: inbound.deal_id ?? undefined,
            action: "facebook.delete_by_message_failed",
            payload: { inboundMessageId: messageId, error: detail },
          });
          await failWorkflowTrace(db, inbound.office_id, workflow.id, error, {
            inboundMessageId: messageId,
            channel,
            outboundMessageId: sent.messageId,
            outcome: "facebook_delete_failed",
          });
          return { sent: true, ...sent, facebookDeleted: false, workflowRunId: workflow.id };
        }
      }

      if (isFacebookPublishApproval(inbound.body)) {
        try {
          const approval = await approveLatestFacebookDraftFromConversation({
            db,
            officeId: inbound.office_id,
            agentId: inbound.agent_id,
          });
          let permalink = approval.existingPermalink;
          let verificationStatus: "graph_confirmed" | "not_visible" | "unverified" | undefined;
          if (approval.status !== "completed") {
            const published = await tasks.triggerAndWait<typeof executeFacebookAction>(
              "execute-facebook-action",
              { actionRequestId: approval.actionRequestId, action: "publish" },
              { idempotencyKey: ["facebook-publish", approval.actionRequestId], idempotencyKeyTTL: "30d" },
            );
            if (!published.ok) throw new Error("Meta did not confirm the Facebook post");
            const parsed = FacebookPublishResultSchema.safeParse(published.output);
            permalink = parsed.success ? parsed.data.permalinkUrl ?? permalink : permalink;
            verificationStatus = parsed.success ? parsed.data.verificationStatus : undefined;
          }
          const replyBody = verificationStatus === "graph_confirmed" && permalink
            ? `Facebook confirmed the post on ${approval.pageName}.\n\n${permalink}`
            : `Meta accepted the post to ${approval.pageName}, but I could not confirm that it is visible yet. Check Recent posts in Harriett before sharing it.`;
          const sent = await sendAgentMessage(db, {
            agentId: inbound.agent_id,
            channel,
            dealId: inbound.deal_id ?? undefined,
            inReplyToId: messageId,
            body: replyBody,
          });
          replySent = true;
          await writeAudit(db, {
            officeId: inbound.office_id,
            actor: "harriett",
            agentId: inbound.agent_id,
            dealId: inbound.deal_id ?? undefined,
            action: "facebook.publish_confirmed_by_message",
            payload: {
              inboundMessageId: messageId,
              actionRequestId: approval.actionRequestId,
              artifactId: approval.artifactId,
              pageName: approval.pageName,
              permalink,
              verificationStatus,
            },
          });
          await completeWorkflowTrace(db, inbound.office_id, workflow.id, {
            inboundMessageId: messageId,
            channel,
            outboundMessageId: sent.messageId,
            providerMessageId: sent.providerMessageId ?? null,
            actionRequestId: approval.actionRequestId,
            outcome: "facebook_published",
          });
          return { sent: true, ...sent, facebookPublished: true, permalink, workflowRunId: workflow.id };
        } catch (error) {
          const detail = error instanceof Error ? error.message : "Facebook did not confirm the post";
          const safeDetail = /^(I could not find|Facebook is not connected|Choose a Facebook Page|The selected Facebook Page|The latest Facebook draft|The draft is missing|The listing-photo caption)/.test(detail)
            ? detail
            : "Facebook did not confirm the post. The draft is still saved and has not been lost.";
          const sent = await sendAgentMessage(db, {
            agentId: inbound.agent_id,
            channel,
            dealId: inbound.deal_id ?? undefined,
            inReplyToId: messageId,
            body: safeDetail,
          });
          replySent = true;
          await writeAudit(db, {
            officeId: inbound.office_id,
            actor: "harriett",
            agentId: inbound.agent_id,
            dealId: inbound.deal_id ?? undefined,
            action: "facebook.publish_by_message_failed",
            payload: { inboundMessageId: messageId, error: detail },
          });
          await failWorkflowTrace(db, inbound.office_id, workflow.id, error, {
            inboundMessageId: messageId,
            channel,
            outboundMessageId: sent.messageId,
            outcome: "facebook_publish_failed",
          });
          return { sent: true, ...sent, facebookPublished: false, workflowRunId: workflow.id };
        }
      }

      if (isFacebookDraftCommand(inbound.body)) {
        try {
          await recordWorkflowEvent(db, inbound.office_id, workflow.id, "facebook.draft_started", {
            inboundMessageId: messageId,
            channel,
          });
          const draft = await createFacebookDraftFromConversation({
            db,
            officeId: inbound.office_id,
            agentId: inbound.agent_id,
            message: inbound.body,
          });
          const replyBody = formatFacebookDraftForWhatsApp(draft);
          const mediaUrls = draft.primaryImageUrl ? [draft.primaryImageUrl] : undefined;
          const sent = await sendAgentMessage(db, {
            agentId: inbound.agent_id,
            channel,
            dealId: inbound.deal_id ?? undefined,
            inReplyToId: messageId,
            body: replyBody,
            mediaUrls,
          });
          replySent = true;
          await writeAudit(db, {
            officeId: inbound.office_id,
            actor: "harriett",
            agentId: inbound.agent_id,
            dealId: inbound.deal_id ?? undefined,
            action: "facebook.draft_created_by_message",
            payload: {
              inboundMessageId: messageId,
              artifactId: draft.artifactId,
              outboundMessageId: sent.messageId,
              channel,
              generationMode: draft.generationMode,
            },
          });
          await recordWorkflowEvent(db, inbound.office_id, workflow.id, "facebook.draft_sent", {
            inboundMessageId: messageId,
            artifactId: draft.artifactId,
            outboundMessageId: sent.messageId,
            providerMessageId: sent.providerMessageId ?? null,
            mediaCount: mediaUrls?.length ?? 0,
          });
          await completeWorkflowTrace(db, inbound.office_id, workflow.id, {
            inboundMessageId: messageId,
            channel,
            artifactId: draft.artifactId,
            outboundMessageId: sent.messageId,
            outcome: "facebook_draft_created",
          });
          return { sent: true, ...sent, facebookDraftCreated: true, artifactId: draft.artifactId, workflowRunId: workflow.id };
        } catch (error) {
          const detail = error instanceof Error ? error.message : "I could not create that Facebook draft.";
          const safeDetail = /^(I could not find|I found more than one|this property|choose a transaction|agent profile)/i.test(detail)
            ? detail
            : "I could not create that Facebook draft. Your transaction data is still safe.";
          const sent = await sendAgentMessage(db, {
            agentId: inbound.agent_id,
            channel,
            dealId: inbound.deal_id ?? undefined,
            inReplyToId: messageId,
            body: safeDetail,
          });
          replySent = true;
          await writeAudit(db, {
            officeId: inbound.office_id,
            actor: "harriett",
            agentId: inbound.agent_id,
            dealId: inbound.deal_id ?? undefined,
            action: "facebook.draft_by_message_failed",
            payload: { inboundMessageId: messageId, error: detail },
          });
          await failWorkflowTrace(db, inbound.office_id, workflow.id, error, {
            inboundMessageId: messageId,
            channel,
            outboundMessageId: sent.messageId,
            outcome: "facebook_draft_failed",
          });
          return { sent: true, ...sent, facebookDraftCreated: false, workflowRunId: workflow.id };
        }
      }

      const turn = await runAgentTurn({
        officeId: inbound.office_id,
        agentId: inbound.agent_id,
        channel,
        message: inbound.body,
        conversationId: inbound.thread_id ?? undefined,
      }, {
        db,
      });
      aiRunId = turn.runId;
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

      const facebookDraft = channel === "whatsapp"
        ? await facebookDraftForRun(db, turn.runId)
        : null;
      const replyBody = facebookDraft
        ? formatFacebookDraftForWhatsApp(facebookDraft)
        : formatAgentMessageForChannel(turn.response, channel);
      const mediaUrls = facebookDraft?.primaryImageUrl ? [facebookDraft.primaryImageUrl] : undefined;
      const sent = await sendAgentMessage(db, {
        agentId: inbound.agent_id,
        channel,
        dealId: inbound.deal_id ?? undefined,
        inReplyToId: messageId,
        body: replyBody,
        mediaUrls,
      });
      replySent = true;
      await recordWorkflowEvent(db, inbound.office_id, workflow.id, "message.reply_sent", {
        inboundMessageId: messageId,
        outboundMessageId: sent.messageId,
        providerMessageId: sent.providerMessageId ?? null,
        dryRun: sent.dryRun ?? false,
        mediaCount: mediaUrls?.length ?? 0,
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
      await completeWorkflowTrace(db, inbound.office_id, workflow.id, {
        inboundMessageId: messageId,
        channel,
        aiRunId: turn.runId,
        outboundMessageId: sent.messageId,
        providerMessageId: sent.providerMessageId ?? null,
        outcome: "sent",
      });
      return { sent: true, ...sent, workflowRunId: workflow.id };
    } catch (error) {
      const traceErrors: unknown[] = [error];
      try {
        await writeAudit(db, {
          officeId: inbound.office_id,
          actor: "harriett",
          agentId: inbound.agent_id,
          dealId: inbound.deal_id ?? undefined,
          action: replySent ? `${channel}.workflow_failed` : `${channel}.reply_failed`,
          payload: {
            inboundMessageId: messageId,
            workflowRunId: workflow.id,
            aiRunId,
            replySent,
            error: String(error),
          },
        });
      } catch (auditError) {
        traceErrors.push(auditError);
      }
      try {
        await failWorkflowTrace(db, inbound.office_id, workflow.id, error, {
          inboundMessageId: messageId,
          channel,
          aiRunId,
          replySent,
        });
      } catch (workflowError) {
        traceErrors.push(workflowError);
      }
      if (traceErrors.length > 1) {
        throw new AggregateError(traceErrors, "agent message processing and trace writes failed");
      }
      throw error;
    }
  },
});
