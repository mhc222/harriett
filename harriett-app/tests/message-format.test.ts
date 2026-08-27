import { describe, expect, it } from "vitest";
import {
  formatAgentMessageForChannel,
  formatFacebookDraftForWhatsApp,
  isContactCardCommand,
  isFacebookDeleteCommand,
  isFacebookDraftCommand,
  isFacebookPublishApproval,
  processingAcknowledgement,
} from "@/lib/ai/message-format";

describe("formatAgentMessageForChannel", () => {
  it("removes markdown chrome from WhatsApp replies", () => {
    expect(
      formatAgentMessageForChannel("**Bottom line**\n\n# Notes\n- **Comp:** $200k", "whatsapp")
    ).toBe("Bottom line\n\nNotes\n- Comp: $200k");
  });

  it("keeps WhatsApp replies phone-sized", () => {
    const long = `${"This is a sentence. ".repeat(90)}Final sentence.`;
    const formatted = formatAgentMessageForChannel(long, "whatsapp");

    expect(formatted.length).toBeLessThanOrEqual(1250);
    expect(formatted).toContain("I can tighten this into a CMA-style note next.");
  });

  it("brings a Facebook draft and secure review link into WhatsApp", () => {
    const formatted = formatFacebookDraftForWhatsApp({
      title: "11417 Woodbank Ridge",
      message: "Space to spread out with five bedrooms and four bathrooms. 🏡\n\n#TuscaloosaRealEstate",
      reviewUrl: "https://harriett-app.vercel.app/social?draft=3278e00d-42ab-4f89-870c-14cdaf890001",
    });

    expect(formatted).toContain("Nothing has been posted yet");
    expect(formatted).toContain("five bedrooms");
    expect(formatted).toContain("Reply POST IT");
    expect(formatted).toContain("/social?draft=");
    expect(formatted.length).toBeLessThanOrEqual(1200);
  });

  it("recognizes explicit conversational Facebook approval without matching draft requests", () => {
    expect(isFacebookPublishApproval("post it")).toBe(true);
    expect(isFacebookPublishApproval("Yes, go ahead and publish that to Facebook.")).toBe(true);
    expect(isFacebookPublishApproval("Make a Facebook post for Woodbank Ridge")).toBe(false);
    expect(isFacebookPublishApproval("What did I post yesterday?")).toBe(false);
  });

  it("recognizes explicit Facebook draft commands", () => {
    expect(isFacebookDraftCommand("Make a Facebook post for Woodbank Ridge")).toBe(true);
    expect(isFacebookDraftCommand("Draft social media copy for my new listing")).toBe(true);
    expect(isFacebookDraftCommand("What did I post yesterday?")).toBe(false);
    expect(isFacebookDraftCommand("post it")).toBe(false);
  });

  it("requires Facebook context for an ambiguous conversational deletion", () => {
    expect(isFacebookDeleteCommand("Delete that Facebook post")).toBe(true);
    expect(isFacebookDeleteCommand("Take the Facebook post down")).toBe(true);
    expect(isFacebookDeleteCommand("delete it")).toBe(false);
    expect(isFacebookDeleteCommand("delete it", true)).toBe(true);
  });

  it("recognizes requests for Harriett's contact card", () => {
    expect(isContactCardCommand("Send me your contact card")).toBe(true);
    expect(isContactCardCommand("Please share Harriett's card.")).toBe(true);
    expect(isContactCardCommand("How do I save you as a contact?")).toBe(true);
    expect(isContactCardCommand("Send me the contract")).toBe(false);
  });

  it("returns deterministic progress copy without a model call", () => {
    expect(processingAcknowledgement({
      body: "Make a Facebook post for Woodbank Ridge",
      seed: "one",
      deadlineExpired: true,
    }))
      .toMatchObject({ category: "facebook_draft", reason: "long_task" });
    expect(processingAcknowledgement({
      body: "Can you make a Facebook listing for Woodbank? New listing",
      seed: "listing-wording",
      deadlineExpired: true,
    })).toMatchObject({ category: "facebook_draft", reason: "long_task" });
    expect(processingAcknowledgement({ body: "post it", seed: "two", deadlineExpired: true }))
      .toMatchObject({ category: "facebook_publish", reason: "long_task" });
  });

  it("stays quiet before the task-specific response deadline", () => {
    expect(processingAcknowledgement({ body: "What time is closing?" }))
      .toEqual({ message: null, category: null, reason: "quick_task" });
    expect(processingAcknowledgement({
      body: "Make a Facebook post for Woodbank Ridge",
    })).toMatchObject({ message: null, reason: "deadline_not_reached" });
  });

  it("gives any unresolved task a fallback after its own deadline", () => {
    expect(processingAcknowledgement({
      body: "What time is closing?",
      seed: "closing-task",
      deadlineExpired: true,
    })).toMatchObject({
      category: null,
      reason: "deadline_fallback",
    });
  });

  it("does not repeat the previous acknowledgement", () => {
    const first = processingAcknowledgement({
      body: "Research current mortgage rates",
      seed: "same",
      deadlineExpired: true,
    });
    const second = processingAcknowledgement({
      body: "Research current mortgage rates",
      seed: "same",
      deadlineExpired: true,
      previousMessage: first.message,
    });
    expect(second.message).not.toBe(first.message);
  });
});
