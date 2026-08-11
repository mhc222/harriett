import { describe, expect, it } from "vitest";
import { generateICS } from "@/lib/ical";

describe("generateICS", () => {
  it("emits an all-day event with exclusive DTEND", () => {
    const ics = generateICS({
      uid: "test-1",
      summary: "Closing",
      startDate: "2026-06-05",
    });
    expect(ics).toContain("DTSTART;VALUE=DATE:20260605");
    expect(ics).toContain("DTEND;VALUE=DATE:20260606");
    expect(ics).toContain("UID:test-1@harriett");
  });

  it("bumps DTEND across a month boundary", () => {
    const ics = generateICS({
      uid: "test-2",
      summary: "Deadline",
      startDate: "2026-04-30",
    });
    expect(ics).toContain("DTEND;VALUE=DATE:20260501");
  });

  it("folds long summary lines per RFC 5545", () => {
    const ics = generateICS({
      uid: "test-3",
      summary: "A".repeat(120),
      startDate: "2026-06-05",
    });
    const summaryChunk = ics.split("\r\n").find((l) => l.startsWith("SUMMARY:"));
    expect(summaryChunk!.length).toBeLessThanOrEqual(75);
    expect(ics).toContain("\r\n A");
  });
});
