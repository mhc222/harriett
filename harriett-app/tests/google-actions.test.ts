import { describe, expect, it } from "vitest";
import { parseGoogleActionPayload, ProposeGoogleActionInputSchema } from "@/lib/google-actions";
import { encodeGoogleEmail } from "@/lib/integrations/google";

describe("Google action contracts", () => {
  it("validates an exact calendar creation payload", () => {
    expect(parseGoogleActionPayload("calendar_create", {
      calendarId: "primary",
      event: {
        summary: "Inspection",
        start: { dateTime: "2026-08-26T10:00:00-05:00" },
        end: { dateTime: "2026-08-26T11:00:00-05:00" },
      },
    })).toMatchObject({ calendarId: "primary", event: { summary: "Inspection" } });
  });

  it("rejects a payload that does not match the selected action", () => {
    expect(ProposeGoogleActionInputSchema.safeParse({
      action: "email_send",
      summary: "Send an email",
      recipientKind: "vendor",
      payload: { resourceName: "people/123" },
    }).success).toBe(false);
  });

  it("encodes reply headers without allowing header injection", () => {
    const raw = encodeGoogleEmail({
      to: ["vendor@example.com"],
      subject: "Inspection update\r\nBcc: bad@example.com",
      text: "The inspection is confirmed.",
      threadId: "thread-1",
      inReplyTo: "<message@example.com>",
      references: "<message@example.com>",
    });
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    expect(decoded).toContain("Subject: Inspection update Bcc: bad@example.com");
    expect(decoded).toContain("In-Reply-To: <message@example.com>");
    expect(decoded).not.toContain("\r\nBcc: bad@example.com\r\n");
  });
});
