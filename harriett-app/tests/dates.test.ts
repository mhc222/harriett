import { describe, expect, it } from "vitest";
import {
  addBusinessDays,
  addDays,
  assertIsoDate,
  closingDisclosureDeadline,
  isBusinessDay,
  leadPaintWindowEnd,
  nextMondayAfter,
  reminderDates,
} from "@/lib/dates";

describe("addDays", () => {
  it("adds within a month", () => {
    expect(addDays("2026-04-10", 5)).toBe("2026-04-15");
  });
  it("crosses a month boundary", () => {
    expect(addDays("2026-04-30", 10)).toBe("2026-05-10");
  });
  it("crosses a year boundary", () => {
    expect(addDays("2026-12-28", 10)).toBe("2027-01-07");
  });
  it("handles leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
  });
  it("subtracts with negative days", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("is stable across DST transitions", () => {
    // US DST spring forward 2026-03-08; string math must not shift
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
  });
  it("rejects malformed input", () => {
    expect(() => addDays("04/30/2026", 1)).toThrow();
    expect(() => addDays("2026-4-30", 1)).toThrow();
    expect(() => addDays("2026-02-30", 1)).toThrow();
  });
});

describe("leadPaintWindowEnd", () => {
  it("is contract acceptance plus 10 calendar days", () => {
    // The Gordo demo transaction: contract accepted 2026-04-30
    expect(leadPaintWindowEnd("2026-04-30")).toBe("2026-05-10");
  });
  it("anchors on acceptance, never closing", () => {
    // Regression guard for the demo bug that computed closing minus 10
    expect(leadPaintWindowEnd("2026-04-30")).not.toBe("2026-05-26");
  });
});

describe("business-day helpers", () => {
  it("identifies weekdays and weekends", () => {
    expect(isBusinessDay("2026-06-05")).toBe(true);
    expect(isBusinessDay("2026-06-06")).toBe(false);
    expect(isBusinessDay("2026-06-07")).toBe(false);
  });

  it("adds and subtracts business days across weekends", () => {
    expect(addBusinessDays("2026-06-05", 1)).toBe("2026-06-08");
    expect(addBusinessDays("2026-06-08", -1)).toBe("2026-06-05");
    expect(addBusinessDays("2026-06-05", -3)).toBe("2026-06-02");
  });

  it("finds the next Monday after a date", () => {
    expect(nextMondayAfter("2026-04-30")).toBe("2026-05-04");
    expect(nextMondayAfter("2026-05-04")).toBe("2026-05-11");
  });

  it("computes the TRID Closing Disclosure deadline", () => {
    expect(closingDisclosureDeadline("2026-06-05")).toBe("2026-06-02");
  });
});

describe("reminderDates", () => {
  it("produces 7/3/1 ahead of the event, oldest first", () => {
    expect(reminderDates("2026-06-05")).toEqual(["2026-05-29", "2026-06-02", "2026-06-04"]);
  });
  it("drops reminders already in the past", () => {
    expect(reminderDates("2026-06-05", [7, 3, 1], "2026-06-01")).toEqual([
      "2026-06-02",
      "2026-06-04",
    ]);
  });
});

describe("assertIsoDate", () => {
  it("accepts valid dates and rejects impossible ones", () => {
    expect(() => assertIsoDate("2026-02-29")).toThrow(); // not a leap year
    expect(() => assertIsoDate("2028-02-29")).not.toThrow();
  });
});
