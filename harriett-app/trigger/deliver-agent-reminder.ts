import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { createServiceClient } from "@/lib/db/server";
import { writeAudit } from "@/lib/audit";
import { sendAgentMessage, type AgentMessagingChannel } from "@/lib/sms";

export const deliverAgentReminder = schemaTask({
  id: "deliver-agent-reminder",
  schema: z.object({
    workItemId: z.string().uuid(),
    expectedReminderAt: z.string().datetime(),
  }),
  run: async ({ workItemId, expectedReminderAt }) => {
    const db = createServiceClient();
    const { data: item, error } = await db
      .from("work_items")
      .select("id, office_id, owner_agent_id, deal_id, title, detail, status, reminder_at, reminder_channel, reminder_sent_at")
      .eq("id", workItemId)
      .single();
    if (error || !item) throw new Error(`reminder work item ${workItemId} was not found`);

    const currentReminderTime = item.reminder_at ? new Date(item.reminder_at).getTime() : null;
    const expectedReminderTime = new Date(expectedReminderAt).getTime();
    const shouldSkip = item.reminder_sent_at
      || ["completed", "cancelled"].includes(item.status)
      || currentReminderTime !== expectedReminderTime;
    if (shouldSkip) {
      await writeAudit(db, {
        officeId: item.office_id,
        actor: "system",
        agentId: item.owner_agent_id,
        dealId: item.deal_id ?? undefined,
        action: "reminder.skipped",
        payload: {
          workItemId,
          expectedReminderAt,
          currentReminderAt: item.reminder_at,
          status: item.status,
          alreadySent: Boolean(item.reminder_sent_at),
        },
      });
      return { sent: false, reason: "stale_or_inactive" as const };
    }

    const claimedAt = new Date().toISOString();
    const { data: claim, error: claimError } = await db
      .from("work_items")
      .update({ reminder_sent_at: claimedAt, updated_at: claimedAt })
      .eq("id", workItemId)
      .is("reminder_sent_at", null)
      .select("id")
      .maybeSingle();
    if (claimError) throw new Error(`reminder claim failed: ${claimError.message}`);
    if (!claim) return { sent: false, reason: "already_claimed" as const };

    const channel = (item.reminder_channel ?? "sms") as AgentMessagingChannel;
    const body = item.detail
      ? `Reminder: ${item.title}\n\n${item.detail}`
      : `Reminder: ${item.title}`;
    let sent;
    try {
      sent = await sendAgentMessage(db, {
        agentId: item.owner_agent_id,
        dealId: item.deal_id ?? undefined,
        channel,
        body,
      });
    } catch (sendError) {
      await db
        .from("work_items")
        .update({ reminder_sent_at: null, updated_at: new Date().toISOString() })
        .eq("id", workItemId)
        .eq("reminder_sent_at", claimedAt);
      await writeAudit(db, {
        officeId: item.office_id,
        actor: "system",
        agentId: item.owner_agent_id,
        dealId: item.deal_id ?? undefined,
        action: "reminder.delivery_failed",
        payload: { workItemId, expectedReminderAt, channel, error: String(sendError) },
      });
      throw sendError;
    }
    await writeAudit(db, {
      officeId: item.office_id,
      actor: "harriett",
      agentId: item.owner_agent_id,
      dealId: item.deal_id ?? undefined,
      action: "reminder.sent",
      payload: { workItemId, expectedReminderAt, channel, messageId: sent.messageId },
    });
    return { sent: true, messageId: sent.messageId };
  },
});
