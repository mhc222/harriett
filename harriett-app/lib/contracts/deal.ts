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
  transactionContacts: z.array(TransactionContactSchema),
  contractTerms: z.array(ContractTermSchema),
  fieldEvidence: z.array(DealFieldEvidenceSchema),
});

export type DealFields = z.infer<typeof DealFieldsSchema>;

const ExtractionContactSchema = z.object({
  name: z.string().min(1),
  role: TransactionContactSchema.shape.role,
  company: z.string(),
  email: z.string(),
  phone: z.string(),
});

const ExtractionContractTermSchema = z.object({
  category: ContractTermSchema.shape.category,
  label: z.string().min(1),
  value: z.string().min(1),
  dueDate: z.string(),
  responsibleParty: z.string(),
  pageNumber: z.number().int().nonnegative(),
  quote: z.string().max(1_200),
  confidence: z.number().min(0).max(1),
});

// Provider-facing extraction envelope. Anthropic limits one structured-output
// object to 16 array or union fields. Empty strings, -1, and page 0 represent
// facts not present in the document, then normalizeDealExtraction restores the
// domain model's null values before any data is saved.
export const DealExtractionSchema = z.object({
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().min(5),
  county: z.string(),
  listPrice: z.number().min(-1),
  salePrice: z.number().min(-1),
  sellers: z.array(z.string()),
  buyers: z.array(z.string()),
  listingAgent: z.string(),
  brokerage: z.string(),
  buyerAgent: z.string(),
  buyerBrokerage: z.string(),
  listingDate: z.string(),
  contractAcceptanceDate: z.string(),
  closingDate: z.string(),
  propertyType: z.string(),
  bedBath: z.string(),
  sqft: z.number().min(-1),
  yearBuilt: z.number().min(-1),
  mlsNumber: z.string(),
  parcelId: z.string(),
  subdivision: z.string(),
  loanType: z.string(),
  earnestMoney: z.number().min(-1),
  sellerConcessions: z.number().min(-1),
  appurtenances: z.array(z.string()),
  flags: DealFieldsSchema.shape.flags,
  transactionContacts: z.array(ExtractionContactSchema),
  contractTerms: z.array(ExtractionContractTermSchema),
  fieldEvidence: z.array(DealFieldEvidenceSchema),
});

export type DealExtraction = z.infer<typeof DealExtractionSchema>;

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function negativeToNull(value: number): number | null {
  return value < 0 ? null : value;
}

export function normalizeDealExtraction(input: DealExtraction): DealFields {
  return DealFieldsSchema.parse({
    ...input,
    county: blankToNull(input.county),
    listPrice: negativeToNull(input.listPrice),
    salePrice: negativeToNull(input.salePrice),
    buyerAgent: blankToNull(input.buyerAgent),
    buyerBrokerage: blankToNull(input.buyerBrokerage),
    listingDate: blankToNull(input.listingDate),
    contractAcceptanceDate: blankToNull(input.contractAcceptanceDate),
    closingDate: blankToNull(input.closingDate),
    bedBath: blankToNull(input.bedBath),
    sqft: negativeToNull(input.sqft),
    yearBuilt: negativeToNull(input.yearBuilt),
    mlsNumber: blankToNull(input.mlsNumber),
    parcelId: blankToNull(input.parcelId),
    subdivision: blankToNull(input.subdivision),
    loanType: blankToNull(input.loanType),
    earnestMoney: negativeToNull(input.earnestMoney),
    sellerConcessions: negativeToNull(input.sellerConcessions),
    transactionContacts: input.transactionContacts.map((contact) => ({
      ...contact,
      company: blankToNull(contact.company),
      email: blankToNull(contact.email),
      phone: blankToNull(contact.phone),
    })),
    contractTerms: input.contractTerms.map((term) => ({
      ...term,
      dueDate: blankToNull(term.dueDate),
      responsibleParty: blankToNull(term.responsibleParty),
      pageNumber: term.pageNumber === 0 ? null : term.pageNumber,
      quote: blankToNull(term.quote),
    })),
  });
}
