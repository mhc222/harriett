import { describe, expect, it } from "vitest";
import {
  TRANSACTION_DOCUMENT_RULES,
  assessTransactionPacket,
  evaluateApplicability,
  type TransactionPacketFacts,
} from "@/lib/transaction-document-rules";

function facts(overrides: Partial<TransactionPacketFacts> = {}): TransactionPacketFacts {
  return {
    stage: "under_contract",
    individualConsumer: true,
    propertyManagement: false,
    sellerRepresentation: true,
    buyerRepresentation: true,
    submittingOffer: true,
    writtenOfferOrContract: true,
    offerOrCounteroffer: true,
    singleFamilyResidential: true,
    residential: true,
    yearBuilt: 1965,
    financingType: "fha",
    consumerMortgage: true,
    dualAgency: false,
    designatedSingleAgency: false,
    pmListing: true,
    pmTransaction: true,
    closed: false,
    ...overrides,
  };
}

describe("transaction document rules", () => {
  it("uses stable unique keys with an authority trail", () => {
    const keys = TRANSACTION_DOCUMENT_RULES.map((rule) => rule.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("al_recad_brokerage_services_disclosure");
    for (const rule of TRANSACTION_DOCUMENT_RULES) {
      expect(rule.authoritySourceIds.length).toBeGreaterThan(0);
      expect(rule.expectedFields.length).toBeGreaterThan(0);
      expect(rule.executionChecks.length).toBeGreaterThan(0);
    }
  });

  it("marks conditional FHA and lead forms applicable from verified facts", () => {
    expect(evaluateApplicability("fha_financing", facts())).toBe("applies");
    expect(evaluateApplicability("pre_1978_residential", facts())).toBe("applies");
    expect(evaluateApplicability("consumer_mortgage_closing", facts())).toBe("applies");
  });

  it("does not require FHA, lead, or mortgage-closing forms for a known cash post-1978 deal", () => {
    const cash = facts({
      yearBuilt: 2004,
      financingType: "cash",
      consumerMortgage: false,
    });
    expect(evaluateApplicability("fha_financing", cash)).toBe("not_applicable");
    expect(evaluateApplicability("pre_1978_residential", cash)).toBe("not_applicable");
    expect(evaluateApplicability("consumer_mortgage_closing", cash)).toBe("not_applicable");
  });

  it("asks for facts instead of guessing applicability", () => {
    const unknown = facts({
      individualConsumer: null,
      propertyManagement: null,
      yearBuilt: null,
      financingType: "unknown",
      dualAgency: null,
    });
    expect(evaluateApplicability("individual_brokerage_services", unknown)).toBe("needs_facts");
    expect(evaluateApplicability("pre_1978_residential", unknown)).toBe("needs_facts");
    expect(evaluateApplicability("fha_financing", unknown)).toBe("needs_facts");
    expect(evaluateApplicability("dual_agency", unknown)).toBe("needs_facts");
  });

  it("reports presence separately from applicability", () => {
    const result = assessTransactionPacket(facts(), [
      "al_general_financed_purchase_agreement",
      "federal_lead_based_paint_disclosure",
    ]);
    const contract = result.find((item) => item.documentKey === "al_general_financed_purchase_agreement");
    const fha = result.find((item) => item.documentKey === "hud_fha_amendatory_clause_and_certification");
    const dual = result.find((item) => item.documentKey === "al_dual_agency_agreement");

    expect(contract).toMatchObject({ applicability: "applies", present: true });
    expect(fha).toMatchObject({ applicability: "applies", present: false, missingSeverity: "block" });
    expect(dual).toMatchObject({ applicability: "not_applicable", present: false });
  });
});
