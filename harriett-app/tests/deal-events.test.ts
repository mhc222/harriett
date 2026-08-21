import { describe, expect, it } from "vitest";
import type { DealFields } from "@/lib/contracts/deal";
import { buildCalendarEvents, buildChecklistRows } from "@/lib/deal-events";

const ids = {
  officeId: "00000000-0000-0000-0000-000000000001",
  dealId: "10000000-0000-0000-0000-000000000001",
  agentId: "00000000-0000-0000-0001-000000000002",
};

// The real demo transaction: 604 2nd St NW, Gordo. Pre-1978, FHA after switch.
const gordo: DealFields = {
  address: "604 2nd St NW",
  city: "Gordo",
  state: "AL",
  zip: "35466",
  county: "Pickens",
  listPrice: 215000,
  salePrice: 208000,
  sellers: ["Larry Chung", "Xuan Vuong", "Amy Rohrer"],
  buyers: ["Shaina Fields", "Kevin Fields"],
  listingAgent: "Jerrod Hastings",
  brokerage: "Pritchett-Moore Real Estate",
  buyerAgent: "Damon Gann",
  buyerBrokerage: "KW Tuscaloosa",
  listingDate: "2025-11-16",
  contractAcceptanceDate: "2026-04-30",
  closingDate: "2026-06-05",
  propertyType: "Single family",
  bedBath: "3/2",
  sqft: 1450,
  yearBuilt: 1962,
  mlsNumber: null,
  parcelId: null,
  subdivision: null,
  loanType: "FHA",
  earnestMoney: 1000,
  sellerConcessions: 9700,
  appurtenances: ["refrigerator", "washer", "dryer"],
  flags: {
    leadPaintDisclosure: true,
    recadRequired: true,
    buyerBeware: true,
    relocationCompany: false,
    fhaLoan: true,
    loanTypeChanged: true,
  },
};

describe("buildCalendarEvents", () => {
  it("anchors the lead paint window on contract acceptance date", () => {
    const events = buildCalendarEvents(gordo, ids);
    const leadPaint = events.find((e) => e.title.includes("Lead Paint"));
    expect(leadPaint?.date).toBe("2026-05-10"); // 2026-04-30 + 10 days
  });

  it("omits the lead paint event without an acceptance date", () => {
    const events = buildCalendarEvents({ ...gordo, contractAcceptanceDate: null }, ids);
    expect(events.find((e) => e.title.includes("Lead Paint"))).toBeUndefined();
  });

  it("omits the lead paint event when the flag is off", () => {
    const events = buildCalendarEvents(
      { ...gordo, flags: { ...gordo.flags, leadPaintDisclosure: false } },
      ids
    );
    expect(events.find((e) => e.title.includes("Lead Paint"))).toBeUndefined();
  });

  it("writes listing and closing events with tenant ids on every row", () => {
    const events = buildCalendarEvents(gordo, ids);
    expect(events.map((e) => e.type)).toEqual(["listing", "closing", "deadline"]);
    for (const e of events) {
      expect(e.office_id).toBe(ids.officeId);
      expect(e.deal_id).toBe(ids.dealId);
    }
  });
});

describe("buildChecklistRows", () => {
  const output = {
    items: [
      {
        category: "under-contract" as const,
        title: "Lead paint window ends",
        detail: null,
        dueDateAnchor: "contract_acceptance_date" as const,
        dueDateOffsetDays: 10,
        dueDateOffsetBusinessDays: null,
        daysFromListing: null,
        required: true,
      },
      {
        category: "closing" as const,
        title: "Closing Disclosure check",
        detail: null,
        dueDateAnchor: "closing_date" as const,
        dueDateOffsetDays: null,
        dueDateOffsetBusinessDays: -3,
        daysFromListing: null,
        required: true,
      },
    ],
  };

  it("computes due dates from explicit anchors and offsets", () => {
    const rows = buildChecklistRows(output, gordo, ids);
    expect(rows[0].due_date).toBe("2026-05-10");
    expect(rows[1].due_date).toBe("2026-06-02");
  });

  it("falls back by category for legacy daysFromListing values", () => {
    const rows = buildChecklistRows(
      {
        items: [
          {
            category: "under-contract" as const,
            title: "Legacy under-contract item",
            detail: null,
            daysFromListing: 3,
            required: true,
          },
          {
            category: "closing" as const,
            title: "Legacy closing item",
            detail: null,
            daysFromListing: -2,
            required: true,
          },
          {
            category: "listing-active" as const,
            title: "Legacy listing item",
            detail: null,
            daysFromListing: 1,
            required: true,
          },
        ],
      },
      gordo,
      ids
    );
    expect(rows[0].due_date).toBe("2026-05-03");
    expect(rows[1].due_date).toBe("2026-06-03");
    expect(rows[2].due_date).toBe("2025-11-17");
  });

  it("leaves due dates null with no anchor at all", () => {
    const rows = buildChecklistRows(
      {
        items: [
          {
            category: "under-contract" as const,
            title: "No contract anchor",
            detail: null,
            daysFromListing: 3,
            required: true,
          },
        ],
      },
      { ...gordo, listingDate: null, contractAcceptanceDate: null },
      ids
    );
    expect(rows[0].due_date).toBeNull();
  });
});
