import { describe, expect, it } from "vitest";
import {
  formatAgentMessageForChannel,
  formatFacebookDraftForWhatsApp,
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
    expect(formatted).toContain("Review, edit, and post:");
    expect(formatted).toContain("/social?draft=");
    expect(formatted.length).toBeLessThanOrEqual(1200);
  });
});
