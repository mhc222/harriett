import { describe, expect, it } from "vitest";
import {
  deterministicReflexResponse,
  routeConversationMessage,
} from "@/lib/ai/conversation-router";

describe("routeConversationMessage", () => {
  it.each([
    "Hi Harriett",
    "Hello",
    "Thanks",
    "Are you there?",
    "Help",
  ])("routes a safe reflex without a model: %s", (message) => {
    expect(routeConversationMessage(message)).toMatchObject({
      lane: "reflex",
      modelTier: "none",
      acknowledgementPolicy: "none",
    });
  });

  it("does not mistake a compound request for a greeting", () => {
    expect(routeConversationMessage("Hi Harriett, make a Facebook post for Woodbank Ridge"))
      .toMatchObject({ lane: "durable", modelTier: "standard" });
  });

  it.each([
    "What listings do I have?",
    "Show me my active listings",
    "List my pending deals",
  ])("routes agent portfolio reads to the fast deal tool: %s", (message) => {
    expect(routeConversationMessage(message)).toMatchObject({
      lane: "fast",
      intent: "deal_lookup",
      modelTier: "fast",
      allowedToolNames: ["searchDeals"],
      quickBudgetMs: 6_000,
    });
  });

  it.each([
    "Post the Woodbank listing to Facebook",
    "Delete that Facebook post",
    "Upload and parse this contract",
  ])("routes consequential work to durable execution: %s", (message) => {
    expect(routeConversationMessage(message)).toMatchObject({
      lane: "durable",
      acknowledgementPolicy: "message_if_slow",
    });
  });

  it("routes document analysis to standard reasoning", () => {
    expect(routeConversationMessage("Which disclosures are missing from this contract?"))
      .toMatchObject({ lane: "standard", modelTier: "standard" });
  });

  it("keeps ambiguous conversation on contextual classification", () => {
    expect(routeConversationMessage("What should I do next?"))
      .toMatchObject({
        lane: "standard",
        intent: "classify_with_context",
      });
  });

  it("creates deterministic human copy only for exact reflexes", () => {
    expect(deterministicReflexResponse("Hi Harriett")).toBe("Hi. What can I help you with?");
    expect(deterministicReflexResponse("Hi Harriett, check my listings")).toBeNull();
  });
});
