import { describe, expect, it } from "vitest";
import { buildHarriettVCard } from "@/lib/contact-card";

describe("buildHarriettVCard", () => {
  it("embeds Harriett's JPEG portrait and messaging number", () => {
    const card = buildHarriettVCard({
      phone: "+12055551234",
      website: "https://harriett.example.com",
      photo: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    });

    expect(card).toContain("FN:Harriett\r\n");
    expect(card).toContain("TEL;TYPE=CELL:+12055551234\r\n");
    expect(card).toContain("PHOTO;ENCODING=b;TYPE=JPEG:");
    expect(card).toContain("/9j/2Q==");
    expect(card.endsWith("END:VCARD\r\n")).toBe(true);
  });

  it("rejects a malformed messaging number", () => {
    expect(() => buildHarriettVCard({
      phone: "205-555-1234",
      website: "https://harriett.example.com",
      photo: Buffer.from("portrait"),
    })).toThrow(/E\.164/);
  });
});
