import { describe, expect, it } from "vitest";
import { DealFieldsSchema, normalizeDealExtraction } from "@/lib/contracts/deal";

const baseDeal = {
  address: "123 Main Street",
  city: "Tuscaloosa",
  state: "AL",
  zip: "35401",
  county: "Tuscaloosa",
  listPrice: null,
  salePrice: 250_000,
  sellers: ["Seller One"],
  buyers: ["Buyer One"],
  listingAgent: "Agent One",
  brokerage: "Pritchett-Moore Real Estate, LLC",
  buyerAgent: null,
  buyerBrokerage: null,
  listingDate: null,
  contractAcceptanceDate: "2026-08-25",
  closingDate: "2026-09-25",
  propertyType: "Single family",
  bedBath: null,
  sqft: null,
  yearBuilt: null,
  mlsNumber: null,
  parcelId: null,
  subdivision: null,
  loanType: null,
  earnestMoney: null,
  sellerConcessions: null,
  appurtenances: [],
  flags: {
    leadPaintDisclosure: false,
    recadRequired: false,
    buyerBeware: true,
    relocationCompany: false,
    fhaLoan: false,
    loanTypeChanged: false,
  },
  transactionContacts: [],
  contractTerms: [],
  fieldEvidence: [],
};

describe("DealFieldsSchema contract mapping", () => {
  it("accepts a missing list price and explicit empty CRM collections", () => {
    const parsed = DealFieldsSchema.parse(baseDeal);
    expect(parsed.listPrice).toBeNull();
    expect(parsed.transactionContacts).toEqual([]);
    expect(parsed.contractTerms).toEqual([]);
    expect(parsed.fieldEvidence).toEqual([]);
  });

  it("preserves material terms with page-linked evidence", () => {
    const parsed = DealFieldsSchema.parse({
      ...baseDeal,
      contractTerms: [{
        category: "inspection",
        label: "Inspection period",
        value: "10 calendar days after acceptance",
        dueDate: "2026-09-04",
        responsibleParty: "Buyer",
        pageNumber: 7,
        quote: "Buyer shall have ten (10) calendar days after Acceptance Date",
        confidence: 0.98,
      }],
      fieldEvidence: [{
        fieldName: "salePrice",
        value: "250000",
        pageNumber: 2,
        quote: "Purchase Price: $250,000.00",
        confidence: 1,
      }],
    });
    expect(parsed.contractTerms[0].pageNumber).toBe(7);
    expect(parsed.fieldEvidence[0].quote).toContain("$250,000");
  });

  it("rejects invalid evidence confidence and page numbers", () => {
    const result = DealFieldsSchema.safeParse({
      ...baseDeal,
      fieldEvidence: [{
        fieldName: "closingDate",
        value: "2026-09-25",
        pageNumber: 0,
        quote: "Closing shall occur on September 25, 2026",
        confidence: 1.2,
      }],
    });
    expect(result.success).toBe(false);
  });

  it("normalizes provider sentinel values before CRM persistence", () => {
    const normalized = normalizeDealExtraction({
      ...baseDeal,
      county: "",
      listPrice: -1,
      buyerAgent: "",
      buyerBrokerage: "",
      listingDate: "",
      bedBath: "",
      sqft: -1,
      yearBuilt: -1,
      mlsNumber: "",
      parcelId: "",
      subdivision: "",
      loanType: "",
      earnestMoney: -1,
      sellerConcessions: -1,
      transactionContacts: [{
        name: "Closing Attorney",
        role: "attorney",
        company: "",
        email: "",
        phone: "",
      }],
    });
    expect(normalized.county).toBeNull();
    expect(normalized.listPrice).toBeNull();
    expect(normalized.transactionContacts[0].email).toBeNull();
  });
});
