import { describe, expect, it } from "vitest";
import { buildCmaPrep, renderCmaPrep } from "@/lib/cma";
import type { PropertyValueEstimate } from "@/lib/integrations/rentcast";

const estimate: PropertyValueEstimate = {
  price: 320000,
  priceRangeLow: 300000,
  priceRangeHigh: 340000,
  subjectProperty: {
    id: "subject-1",
    formattedAddress: "100 Main St, Tuscaloosa, AL 35401",
    propertyType: "Single Family",
    bedrooms: 3,
    bathrooms: 2,
    squareFootage: 2000,
    yearBuilt: 2000,
  },
  comparables: [
    {
      id: "strong-comp",
      formattedAddress: "104 Main St, Tuscaloosa, AL 35401",
      propertyType: "Single Family",
      bedrooms: 3,
      bathrooms: 2,
      squareFootage: 1900,
      yearBuilt: 2003,
      status: "Sold",
      lastSaleDate: "2026-06-01",
      price: 310000,
      distance: 0.4,
      daysOld: 84,
    },
    {
      id: "unverified-comp",
      formattedAddress: "108 Main St, Tuscaloosa, AL 35401",
      propertyType: "Single Family",
      bedrooms: 3,
      bathrooms: 2,
      squareFootage: 2050,
      yearBuilt: 1998,
      price: 325000,
      distance: 0.8,
      daysOld: 45,
    },
    {
      id: "mismatch-comp",
      formattedAddress: "1 Condo Way, Tuscaloosa, AL 35401",
      propertyType: "Condo",
      bedrooms: 1,
      bathrooms: 1,
      squareFootage: 900,
      yearBuilt: 2024,
      status: "Sold",
      lastSaleDate: "2026-07-01",
      price: 210000,
      distance: 7,
      daysOld: 54,
    },
  ],
};

describe("CMA expert prep", () => {
  it("ranks a similar observed sale for inclusion", () => {
    const cma = buildCmaPrep(estimate, "2026-08-24T12:00:00.000Z");
    expect(cma.candidates[0]).toMatchObject({
      id: "strong-comp",
      rank: 1,
      decision: "include",
      saleEvidence: "provider_observed_sale",
    });
    expect(cma.candidates[0].reasons).toContain("Same observed property type as the subject.");
  });

  it("keeps a strong candidate in review when a closed sale is not established", () => {
    const cma = buildCmaPrep(estimate);
    expect(cma.candidates.find((candidate) => candidate.id === "unverified-comp")).toMatchObject({
      decision: "review",
      saleEvidence: "not_available",
    });
  });

  it("rejects a hard property-type mismatch and records why", () => {
    const cma = buildCmaPrep(estimate);
    const mismatch = cma.candidates.find((candidate) => candidate.id === "mismatch-comp");
    expect(mismatch?.decision).toBe("exclude");
    expect(mismatch?.concerns.join(" ")).toContain("Property type differs");
  });

  it("caps public-data confidence and requires three qualified closed candidates", () => {
    const cma = buildCmaPrep(estimate);
    expect(cma.confidence.score).toBeLessThanOrEqual(65);
    expect(cma.evidenceGaps).toContain(
      "Fewer than three candidate closed sales meet the inclusion threshold."
    );
    expect(cma.conclusion).toContain("not sufficient");
  });

  it("shows calculations and refuses rule-of-thumb adjustments in the saved workfile", () => {
    const workfile = renderCmaPrep(buildCmaPrep(estimate));
    expect(workfile).toContain("Comp decisions");
    expect(workfile).toContain("INCLUDE");
    expect(workfile).toContain("No dollar adjustment is applied from a rule of thumb.");
    expect(workfile).toContain("not an appraisal or a broker-reviewed CMA");
  });

  it("adds unique portal-observed candidates without replacing RentCast evidence", () => {
    const cma = buildCmaPrep(estimate, "2026-08-24T12:00:00.000Z", [{
      id: "brightdata:55",
      source: "brightdata",
      sourceUrl: "https://www.zillow.com/homedetails/example/55_zpid/",
      formattedAddress: "110 Main St, Tuscaloosa, AL 35401",
      propertyType: "Single Family",
      bedrooms: 3,
      bathrooms: 2,
      squareFootage: 1980,
      yearBuilt: 2001,
      status: "RECENTLY_SOLD",
      lastSaleDate: "2026-07-01",
      price: 318000,
      distance: 0.9,
      daysOld: 54,
    }]);
    expect(cma.candidates.some((candidate) => candidate.source === "brightdata")).toBe(true);
    expect(cma.candidates.some((candidate) => candidate.source === "rentcast")).toBe(true);
  });

  it("caps the primary comp set and demotes extreme price outliers", () => {
    const sold = Array.from({ length: 8 }, (_, index) => ({
      id: `sold-${index}`,
      source: "rentcast" as const,
      sourceUrl: null,
      formattedAddress: `${200 + index} Main St, Tuscaloosa, AL 35401`,
      propertyType: "Single Family",
      bedrooms: 3,
      bathrooms: 2,
      squareFootage: 2000,
      yearBuilt: 2000,
      status: "Sold",
      lastSaleDate: "2026-07-01",
      price: index === 0 ? 2_000_000 : 315000 + index * 1000,
      distance: 0.2 + index * 0.1,
      daysOld: 55,
    }));
    const cma = buildCmaPrep(estimate, "2026-08-24T12:00:00.000Z", sold);

    expect(cma.counts.included).toBeLessThanOrEqual(6);
    expect(cma.candidates.find((candidate) => candidate.id === "sold-0")).toMatchObject({
      decision: "review",
    });
    expect(cma.candidates.find((candidate) => candidate.id === "sold-0")?.concerns.join(" "))
      .toContain("extreme outlier");
  });
});
