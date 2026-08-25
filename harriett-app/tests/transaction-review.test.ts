import { describe, expect, it } from "vitest";
import type { DealFields } from "@/lib/contracts/deal";
import {
  coerceReviewCorrection,
  derivePacketFacts,
  formatReviewValue,
} from "@/lib/transaction-review";

function deal(overrides: Partial<DealFields> = {}): DealFields {
  return {
    address: "604 2nd Street NW",
    city: "Gordo",
    state: "AL",
    zip: "35466",
    county: "Pickens",
    listPrice: null,
    salePrice: 214_500,
    sellers: ["Tanner Seller"],
    buyers: ["Tanner Buyer"],
    listingAgent: "Tanner Ashcraft",
    brokerage: "Pritchett-Moore Real Estate, LLC",
    buyerAgent: null,
    buyerBrokerage: null,
    listingDate: null,
    contractAcceptanceDate: "2026-04-18",
    closingDate: "2026-06-05",
    propertyType: "Single family residential",
    bedBath: null,
    sqft: null,
    yearBuilt: 1975,
    mlsNumber: null,
    parcelId: null,
    subdivision: null,
    loanType: "FHA",
    earnestMoney: 1_000,
    sellerConcessions: null,
    appurtenances: [],
    flags: {
      leadPaintDisclosure: true,
      recadRequired: true,
      buyerBeware: true,
      relocationCompany: false,
      fhaLoan: true,
      loanTypeChanged: false,
    },
    transactionContacts: [],
    contractTerms: [],
    fieldEvidence: [],
    ...overrides,
  };
}

describe("transaction review", () => {
  it("coerces correction values without inventing blank optional facts", () => {
    expect(coerceReviewCorrection("salePrice", "$218,750")).toBe(218_750);
    expect(coerceReviewCorrection("sellerConcessions", "")).toBeNull();
    expect(coerceReviewCorrection("sellers", "One Seller, Two Seller")).toEqual(["One Seller", "Two Seller"]);
    expect(() => coerceReviewCorrection("state", "Alabama")).toThrow("two-letter");
  });

  it("derives only packet facts supported by structured transaction data", () => {
    const facts = derivePacketFacts("under_contract", deal(), ["purchase_agreement"]);
    expect(facts.writtenOfferOrContract).toBe(true);
    expect(facts.singleFamilyResidential).toBe(true);
    expect(facts.financingType).toBe("fha");
    expect(facts.consumerMortgage).toBe(true);
    expect(facts.individualConsumer).toBeNull();
    expect(facts.dualAgency).toBeNull();
    expect(facts.buyerRepresentation).toBeNull();
  });

  it("keeps ambiguous residential property types unresolved", () => {
    const facts = derivePacketFacts("under_contract", deal({ propertyType: "Residential" }), ["purchase_agreement"]);
    expect(facts.residential).toBe(true);
    expect(facts.singleFamilyResidential).toBeNull();
  });

  it("formats missing and money values for review", () => {
    expect(formatReviewValue("salePrice", 214_500)).toBe("$214,500");
    expect(formatReviewValue("closingDate", null)).toBe("Not found in the document");
  });
});
