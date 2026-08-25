import { describe, expect, it } from "vitest";
import type { DealFields } from "@/lib/contracts/deal";
import { deriveVerbatimFieldEvidence } from "@/lib/deal-crm";

const fields = {
  address: "604 2nd St NW",
  city: "Gordo",
  state: "AL",
  zip: "35466",
  county: "Pickens",
  propertyType: "Single family residence",
  listingAgent: "Jerrod Hastings",
  buyerAgent: null,
} as DealFields;

describe("deriveVerbatimFieldEvidence", () => {
  it("fans full-address evidence out to its displayed components", () => {
    const evidence = deriveVerbatimFieldEvidence(fields, [{
      fieldName: "address",
      value: fields.address,
      confidence: 0.95,
      pageNumber: 1,
      excerpt: "604 2nd St NW, Gordo, AL 35466, Pickens County",
    }], []);
    expect(evidence.map((item) => item.fieldName)).toEqual(["city", "state", "zip", "county"]);
    expect(evidence.every((item) => item.pageNumber === 1)).toBe(true);
  });

  it("uses only an exact indexed-page match for another fact", () => {
    const evidence = deriveVerbatimFieldEvidence(fields, [], [{
      page_number: 1,
      content: "Property classification\nSingle family residence\nOther text",
    }]);
    expect(evidence).toEqual([expect.objectContaining({
      fieldName: "propertyType",
      pageNumber: 1,
      excerpt: "Single family residence",
    })]);
  });

  it("does not create evidence for a value absent from the page", () => {
    expect(deriveVerbatimFieldEvidence(fields, [], [{ page_number: 1, content: "Vacant land" }])).toEqual([]);
  });
});
