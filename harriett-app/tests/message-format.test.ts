import { describe, expect, it } from "vitest";
import { formatAgentMessageForChannel } from "@/lib/ai/message-format";

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
});
