import { describe, expect, it } from "vitest";
import { AgentDealSearchOutputSchema } from "@/lib/agent-deals";
import { routeConversationMessage } from "@/lib/ai/conversation-router";
import {
  isFacebookDeleteCommand,
  processingAcknowledgement,
} from "@/lib/ai/message-format";

describe("golden Facebook conversation", () => {
  const draftRequest = "Can you make a Facebook listing for Woodbank? New listing";

  it("routes the draft, approval, and deletion turns through durable work", () => {
    for (const message of [draftRequest, "post it", "delete it"]) {
      expect(routeConversationMessage(message)).toMatchObject({
        lane: "durable",
        acknowledgementPolicy: "message_if_slow",
      });
    }
  });

  it("resolves an abbreviated delete only when the conversation has Facebook context", () => {
    expect(isFacebookDeleteCommand("delete it", false)).toBe(false);
    expect(isFacebookDeleteCommand("delete it", true)).toBe(true);
  });

  it("keeps the three link contracts separate", () => {
    const result = AgentDealSearchOutputSchema.parse({
      deals: [{
        id: "11111111-1111-4111-8111-111111111111",
        address: "11417 Woodbank Ridge",
        city: "Tuscaloosa",
        status: "listing_active",
        listPrice: 998_500,
        salePrice: null,
        contractAcceptanceDate: null,
        closingDate: null,
        publicListingUrl: "https://www.pritchett-moore.com/properties/175589/details",
        primaryImageUrl: "https://images.example/woodbank.jpg",
        facebookArtifactId: "22222222-2222-4222-8222-222222222222",
        privateReviewUrl: "https://harriett.example/social?draft=22222222-2222-4222-8222-222222222222",
        liveFacebookUrl: "https://www.facebook.com/pritchettmoore/posts/123",
        facebookArtifactStatus: "published",
      }],
    });
    const deal = result.deals[0];

    expect(new Set([
      deal.publicListingUrl,
      deal.privateReviewUrl,
      deal.liveFacebookUrl,
    ]).size).toBe(3);
    expect(deal.publicListingUrl).toContain("pritchett-moore.com/properties/");
    expect(deal.privateReviewUrl).toContain("/social?draft=");
    expect(deal.liveFacebookUrl).toContain("facebook.com/");
  });

  it("makes deadline feedback per task instead of suppressing a second turn", () => {
    const draftFeedback = processingAcknowledgement({
      body: draftRequest,
      seed: "inbound-draft",
      deadlineExpired: true,
    });
    const publishFeedback = processingAcknowledgement({
      body: "post it",
      seed: "inbound-publish",
      deadlineExpired: true,
    });

    expect(draftFeedback).toMatchObject({ category: "facebook_draft", reason: "long_task" });
    expect(publishFeedback).toMatchObject({ category: "facebook_publish", reason: "long_task" });
    expect(draftFeedback.message).toBeTruthy();
    expect(publishFeedback.message).toBeTruthy();
  });
});
