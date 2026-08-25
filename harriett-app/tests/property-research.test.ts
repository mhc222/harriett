import { describe, expect, it } from "vitest";
import {
  googleMapsSearchUrl,
  normalizePropertyAddress,
  valuationRead,
  valuationConfidenceFlags,
  zillowSearchUrl,
} from "@/lib/property-research";

const estimate = {
  price: 220000,
  priceRangeLow: 200000,
  priceRangeHigh: 240000,
  subjectProperty: {
    id: "subject-1",
    formattedAddress: "2320 Starlight Dr, Tuscaloosa, AL 35405",
  },
  comparables: [
    {
      id: "comp-1",
      formattedAddress: "2300 Starlight Dr, Tuscaloosa, AL 35405",
      price: 215000,
    },
  ],
};

describe("property research", () => {
  it("normalizes addresses for office-level identity", () => {
    expect(normalizePropertyAddress(" 2320 Starlight Dr., Tuscaloosa, AL 35405 ")).toBe(
      "2320 starlight dr tuscaloosa al 35405"
    );
  });

  it("labels public automated valuations for MLS verification", () => {
    expect(valuationConfidenceFlags(estimate)).toEqual([
      "public_data_only",
      "automated_estimate",
      "mls_verification_required",
    ]);
  });

  it("flags sparse and unusually wide results", () => {
    expect(
      valuationConfidenceFlags({
        ...estimate,
        priceRangeLow: 170000,
        priceRangeHigh: 270000,
        comparables: [],
      })
    ).toEqual([
      "public_data_only",
      "automated_estimate",
      "mls_verification_required",
      "no_comparables",
      "wide_valuation_range",
    ]);
  });

  it("builds an evidence-based read from saved valuation data", () => {
    expect(valuationRead(estimate)).toMatchObject({
      headline: "The automated estimate tracks fairly closely with the middle of the returned public-data comps.",
      evidence: [
        "1 public-data comp has a median price of $215,000.",
        "The strongest returned match is 2300 Starlight Dr, Tuscaloosa, AL 35405 at $215,000.",
        "RentCast's range runs from $200,000 to $240,000, an approximately 18% spread around the estimate.",
      ],
      nextStep: expect.stringContaining("verify the best comps"),
    });
  });

  it("creates outbound verification links without fetching third-party content", () => {
    const address = "2320 Starlight Dr, Tuscaloosa, AL 35405";
    expect(googleMapsSearchUrl(address)).toBe(
      "https://www.google.com/maps/search/?api=1&query=2320%20Starlight%20Dr%2C%20Tuscaloosa%2C%20AL%2035405"
    );
    expect(zillowSearchUrl(address)).toBe(
      "https://www.zillow.com/homes/2320-Starlight-Dr-Tuscaloosa-AL-35405_rb/"
    );
  });
});
