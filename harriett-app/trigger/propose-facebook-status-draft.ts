import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { formatFacebookDraftForWhatsApp } from "@/lib/ai/message-format";
import { writeAudit } from "@/lib/audit";
import { createServiceClient } from "@/lib/db/server";
import { messageDeliveryMode, sendAgentMessage } from "@/lib/sms";
import { createFacebookDraft, SocialPostTypeSchema } from "@/lib/social-drafts";

const FacebookStatusDraftSchema = z.object({
  officeId: z.string().uuid(),
  agentId: z.string().uuid(),
  dealId: z.string().uuid(),
  postType: SocialPostTypeSchema,
  status: z.string().min(1),
});

export const proposeFacebookStatusDraft = schemaTask({
  id: "propose-facebook-status-draft",
  schema: FacebookStatusDraftSchema,
  retry: { maxAttempts: 2 },
  queue: { name: "facebook-draft-proposals", concurrencyLimit: 2 },
  run: async (input) => {
    const db = createServiceClient();
    const { data: agent, error: agentError } = await db.from("agents")
      .select("id,phone,sms_consent,active")
      .eq("id", input.agentId)
      .eq("office_id", input.officeId)
      .single();
    if (agentError || !agent?.active || !agent.phone || agent.sms_consent === "opted_out") {
      await writeAudit(db, {
        officeId: input.officeId,
        actor: "harriett",
        agentId: input.agentId,
        dealId: input.dealId,
        action: "facebook.status_draft_skipped",
        payload: { status: input.status, reason: "agent_not_available_on_whatsapp" },
      });
      return { proposed: false, reason: "agent_not_available_on_whatsapp" as const };
    }
    if (messageDeliveryMode("whatsapp") === "disabled") {
      await writeAudit(db, {
        officeId: input.officeId,
        actor: "harriett",
        agentId: input.agentId,
        dealId: input.dealId,
        action: "facebook.status_draft_skipped",
        payload: { status: input.status, reason: "whatsapp_disabled" },
      });
      return { proposed: false, reason: "whatsapp_disabled" as const };
    }

    const { data: existing } = await db.from("artifacts")
      .select("id")
      .eq("office_id", input.officeId)
      .eq("agent_id", input.agentId)
      .eq("deal_id", input.dealId)
      .eq("kind", "social_post")
      .neq("status", "archived")
      .contains("content", {
        post_type: input.postType,
        proposal_source: "deal_status_change",
      })
      .limit(1)
      .maybeSingle();
    if (existing) return { proposed: false, reason: "already_proposed" as const, artifactId: existing.id };

    try {
      const draft = await createFacebookDraft({
        db,
        officeId: input.officeId,
        agentId: input.agentId,
        actor: "harriett",
        proposalSource: "deal_status_change",
        postType: input.postType,
        shareMode: "link_preview",
        dealId: input.dealId,
        notes: `Create a review-only Facebook draft for the verified ${input.status.replaceAll("_", " ")} status change.`,
      });
      const body = formatFacebookDraftForWhatsApp({
        title: draft.title,
        message: draft.message,
        reviewUrl: draft.reviewUrl,
      });
      const sent = await sendAgentMessage(db, {
        agentId: input.agentId,
        channel: "whatsapp",
        dealId: input.dealId,
        body,
        mediaUrls: draft.primaryImageUrl ? [draft.primaryImageUrl] : undefined,
      });
      await writeAudit(db, {
        officeId: input.officeId,
        actor: "harriett",
        agentId: input.agentId,
        dealId: input.dealId,
        action: "facebook.status_draft_proposed",
        payload: {
          status: input.status,
          postType: input.postType,
          artifactId: draft.artifactId,
          messageId: sent.messageId,
          mediaIncluded: Boolean(draft.primaryImageUrl),
        },
      });
      return { proposed: true, artifactId: draft.artifactId, messageId: sent.messageId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("verified Pritchett-Moore listing link")) {
        await writeAudit(db, {
          officeId: input.officeId,
          actor: "harriett",
          agentId: input.agentId,
          dealId: input.dealId,
          action: "facebook.status_draft_skipped",
          payload: { status: input.status, reason: "official_listing_unavailable" },
        });
        return { proposed: false, reason: "official_listing_unavailable" as const };
      }
      throw error;
    }
  },
});
