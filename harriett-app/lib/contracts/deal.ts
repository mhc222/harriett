import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

// Ported from the demo DealFields, plus contractAcceptanceDate: the executed
// date of the purchase agreement. The federal lead-paint 10-day window anchors
// here, not on listing or closing dates.
export const DealFieldsSchema = z.object({
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().min(5),
  county: z.string().nullable(),
  listPrice: z.number(),
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
});

export type DealFields = z.infer<typeof DealFieldsSchema>;
