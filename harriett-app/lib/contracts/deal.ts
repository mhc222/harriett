import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const TransactionContactSchema = z.object({
  name: z.string().min(1),
  role: z.enum(["seller", "buyer", "buyer_agent", "lender", "title", "attorney", "other"]),
  company: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
});

export const ContractTermSchema = z.object({
  category: z.enum([
    "financing",
    "earnest_money",
    "inspection",
    "appraisal",
    "title",
    "closing",
    "possession",
    "property_condition",
    "contingency",
    "addendum",
    "special_stipulation",
    "included_item",
    "excluded_item",
    "other",
  ]),
  label: z.string().min(1),
  value: z.string().min(1),
  dueDate: isoDate.nullable(),
  responsibleParty: z.string().nullable(),
  pageNumber: z.number().int().positive().nullable(),
  quote: z.string().max(1_200).nullable(),
  confidence: z.number().min(0).max(1),
});

export const DealFieldEvidenceSchema = z.object({
  fieldName: z.string().min(1),
  value: z.string(),
  pageNumber: z.number().int().positive(),
  quote: z.string().min(1).max(1_200),
  confidence: z.number().min(0).max(1),
});

// Ported from the demo DealFields, plus contractAcceptanceDate: the executed
// date of the purchase agreement. The federal lead-paint 10-day window anchors
// here, not on listing or closing dates.
export const DealFieldsSchema = z.object({
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().min(5),
  county: z.string().nullable(),
  listPrice: z.number().nullable(),
  salePrice: z.number().nullable(),
  sellers: z.array(z.string()),
  buyers: z.array(z.string()),
  listingAgent: z.string(),
  brokerage: z.string(),
  buyerAgent: z.string().nullable(),
  buyerBrokerage: z.string().nullable(),
  listingDate: isoDate.nullable(),
  contractAcceptanceDate: isoDate.nullable(),
  closingDate: isoDate.nullable(),
  propertyType: z.string(),
  bedBath: z.string().nullable(),
  sqft: z.number().nullable(),
  yearBuilt: z.number().nullable(),
  mlsNumber: z.string().nullable(),
  parcelId: z.string().nullable(),
  subdivision: z.string().nullable(),
  loanType: z.string().nullable(),
  earnestMoney: z.number().nullable(),
  sellerConcessions: z.number().nullable(),
  appurtenances: z.array(z.string()),
  flags: z.object({
    leadPaintDisclosure: z.boolean(),
    recadRequired: z.boolean(),
    buyerBeware: z.boolean(),
    relocationCompany: z.boolean(),
    fhaLoan: z.boolean(),
    loanTypeChanged: z.boolean(),
  }),
  transactionContacts: z.array(TransactionContactSchema).default([]),
  contractTerms: z.array(ContractTermSchema).default([]),
  fieldEvidence: z.array(DealFieldEvidenceSchema).default([]),
});

export type DealFields = z.infer<typeof DealFieldsSchema>;
