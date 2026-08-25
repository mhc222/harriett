import { describe, expect, it } from "vitest";
import {
  decodeGmailPushData,
  googleMailMatchesRecipients,
  hashGoogleChannelToken,
  monitoredGmailQuery,
  monitoredGmailRecipients,
  normalizeGoogleMailMetadata,
} from "@/lib/google-monitoring";

describe("Google monitoring", () => {
  it("decodes Gmail Pub/Sub notification data", () => {
    const data = Buffer.from(JSON.stringify({
      emailAddress: "matt@example.com",
      historyId: "987654321",
    })).toString("base64");
    expect(decodeGmailPushData(data)).toEqual({
      emailAddress: "matt@example.com",
      historyId: "987654321",
    });
  });

  it("hashes Calendar channel tokens without retaining the secret", () => {
    const hash = hashGoogleChannelToken("a-secret-calendar-channel-token");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("secret");
  });

  it("classifies transaction mail and marks action requests for attention", () => {
    const result = normalizeGoogleMailMetadata({
      id: "gmail-1",
      threadId: "thread-1",
      labelIds: ["INBOX", "UNREAD"],
      snippet: "Please review the inspection addendum and respond by Friday.",
      historyId: "100",
      internalDate: "1700000000000",
      payload: {
        headers: [
          { name: "From", value: "Closing Team <closing@example.com>" },
          { name: "To", value: "Matt <matt@example.com>" },
          { name: "Subject", value: "Inspection addendum" },
          { name: "Message-ID", value: "<provider-message-id@example.com>" },
        ],
      },
    });
    expect(result.category).toBe("transaction");
    expect(result.needs_attention).toBe(true);
    expect(result.priority).toBe("high");
    expect(result.source_url).toContain("gmail-1");
  });

  it("keeps marketing mail low priority", () => {
    const result = normalizeGoogleMailMetadata({
      id: "gmail-2",
      labelIds: ["INBOX"],
      snippet: "Newsletter preferences and unsubscribe link.",
      payload: { headers: [{ name: "Subject", value: "Weekly newsletter" }] },
    });
    expect(result.category).toBe("marketing");
    expect(result.priority).toBe("low");
    expect(result.needs_attention).toBe(false);
  });

  it("only accepts mail addressed to a configured test alias", () => {
    const allowed = monitoredGmailRecipients("mhc222+harriett@gmail.com");
    expect(monitoredGmailQuery(allowed)).toBe("to:mhc222+harriett@gmail.com");
    expect(googleMailMatchesRecipients({
      payload: { headers: [{ name: "To", value: "Harriett <mhc222+harriett@gmail.com>" }] },
    }, allowed)).toBe(true);
    expect(googleMailMatchesRecipients({
      payload: { headers: [{ name: "To", value: "mhc222@gmail.com" }] },
    }, allowed)).toBe(false);
  });
});
