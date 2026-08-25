import { z } from "zod";
import type { DealFields } from "@/lib/contracts/deal";
import {
  TransactionPacketFactsSchema,
  type TransactionPacketFacts,
} from "@/lib/transaction-document-rules";

export const REVIEW_FIELD_KEYS = [
  "address",
  "city",
  "state",
  "zip",
  "county",
  "propertyType",
  "yearBuilt",
  "listPrice",
  "salePrice",
  "earnestMoney",
  "sellerConcessions",
  "loanType",
  "listingDate",
  "contractAcceptanceDate",
  "closingDate",
  "sellers",
  "buyers",
  "listingAgent",
  "buyerAgent",
] as const;

export const ReviewFieldKeySchema = z.enum(REVIEW_FIELD_KEYS);
export type ReviewFieldKey = z.infer<typeof ReviewFieldKeySchema>;

export const REVIEW_FIELD_DEFINITIONS: Record<ReviewFieldKey, {
  label: string;
  group: "Property" | "Money" | "Dates" | "People";
  input: "text" | "number" | "date" | "list";
  required?: boolean;
}> = {
  address: { label: "Street address", group: "Property", input: "text", required: true },
  city: { label: "City", group: "Property", input: "text", required: true },
  state: { label: "State", group: "Property", input: "text", required: true },
  zip: { label: "ZIP code", group: "Property", input: "text", required: true },
  county: { label: "County", group: "Property", input: "text" },
  propertyType: { label: "Property type", group: "Property", input: "text" },
  yearBuilt: { label: "Year built", group: "Property", input: "number" },
  listPrice: { label: "List price", group: "Money", input: "number" },
  salePrice: { label: "Purchase price", group: "Money", input: "number" },
  earnestMoney: { label: "Earnest money", group: "Money", input: "number" },
  sellerConcessions: { label: "Seller concessions", group: "Money", input: "number" },
  loanType: { label: "Financing", group: "Money", input: "text" },
  listingDate: { label: "Listing date", group: "Dates", input: "date" },
  contractAcceptanceDate: { label: "Acceptance date", group: "Dates", input: "date" },
  closingDate: { label: "Closing date", group: "Dates", input: "date" },
  sellers: { label: "Sellers", group: "People", input: "list" },
  buyers: { label: "Buyers", group: "People", input: "list" },
  listingAgent: { label: "Listing agent", group: "People", input: "text" },
  buyerAgent: { label: "Buyer agent", group: "People", input: "text" },
};

const nullableNumeric = new Set<ReviewFieldKey>([
  "yearBuilt", "listPrice", "salePrice", "earnestMoney", "sellerConcessions",
]);
const nullableDates = new Set<ReviewFieldKey>([
  "listingDate", "contractAcceptanceDate", "closingDate",
]);
const listFields = new Set<ReviewFieldKey>(["sellers", "buyers"]);
const requiredText = new Set<ReviewFieldKey>(["address", "city", "state", "zip"]);

export function coerceReviewCorrection(fieldName: ReviewFieldKey, rawValue: string): unknown {
  const trimmed = rawValue.trim();
  if (listFields.has(fieldName)) {
    return trimmed
      ? trimmed.split(/\n|,/).map((value) => value.trim()).filter(Boolean)
      : [];
  }
  if (nullableNumeric.has(fieldName)) {
    if (!trimmed) return null;
    const number = Number(trimmed.replace(/[$,]/g, ""));
    if (!Number.isFinite(number)) throw new Error("Enter a valid number.");
    if (fieldName === "yearBuilt" && (!Number.isInteger(number) || number < 1600 || number > 2200)) {
      throw new Error("Enter a four-digit year.");
    }
    return number;
  }
  if (nullableDates.has(fieldName)) {
    if (!trimmed) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) throw new Error("Enter a date as YYYY-MM-DD.");
    return trimmed;
  }
  if (!trimmed && requiredText.has(fieldName)) throw new Error("This fact cannot be blank.");
  if (fieldName === "state" && !/^[A-Za-z]{2}$/.test(trimmed)) throw new Error("Use a two-letter state code.");
  return trimmed || null;
}

export function formatReviewValue(fieldName: ReviewFieldKey, value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not found in the document";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Not found in the document";
  if (["listPrice", "salePrice", "earnestMoney", "sellerConcessions"].includes(fieldName) && typeof value === "number") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  }
  return String(value);
}

function financingType(value: string | null): TransactionPacketFacts["financingType"] {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) return "unknown";
  if (normalized.includes("cash")) return "cash";
  if (normalized.includes("conventional")) return "conventional";
  if (normalized.includes("fha")) return "fha";
  if (normalized.includes("va")) return "va";
  if (normalized.includes("usda")) return "usda";
  return "other";
}

function includesPm(value: string | null | undefined): boolean | null {
  if (!value?.trim()) return null;
  return /pritchett[\s-]*moore/i.test(value);
}

function residentialType(value: string | null | undefined): boolean | null {
  if (!value?.trim()) return null;
  if (/single[\s-]*family|residential|condo|minium|townhome|manufactured|mobile home/i.test(value)) return true;
  if (/commercial|industrial|land|lot|farm/i.test(value)) return false;
  return null;
}

function singleFamilyType(value: string | null | undefined): boolean | null {
  if (!value?.trim()) return null;
  if (/single[\s-]*family/i.test(value)) return true;
  if (/condo|minium|townhome|multi[\s-]*family|duplex|triplex|apartment|commercial|industrial|land|lot|farm/i.test(value)) return false;
  return null;
}

export function derivePacketFacts(
  status: string,
  fields: DealFields,
  documentTypes: Iterable<string>
): TransactionPacketFacts {
  const types = new Set(documentTypes);
  const hasPurchaseAgreement = types.has("purchase_agreement") || types.has("al_general_financed_purchase_agreement");
  const hasListingAgreement = types.has("listing_agreement") || types.has("pm_exclusive_right_to_sell_listing_agreement");
  const financing = financingType(fields.loanType);
  const residential = residentialType(fields.propertyType);
  const stage = status === "closed" ? "closed"
    : status === "closing" ? "pre_closing"
      : status === "under_contract" ? "under_contract"
        : status === "listing_active" ? "listing_active"
          : "pre_listing";
  return TransactionPacketFactsSchema.parse({
    stage,
    individualConsumer: null,
    propertyManagement: null,
    sellerRepresentation: hasListingAgreement ? includesPm(fields.brokerage) : null,
    buyerRepresentation: hasPurchaseAgreement ? includesPm(fields.buyerBrokerage) : null,
    submittingOffer: hasPurchaseAgreement ? true : null,
    writtenOfferOrContract: hasPurchaseAgreement ? true : null,
    offerOrCounteroffer: hasPurchaseAgreement ? true : null,
    singleFamilyResidential: singleFamilyType(fields.propertyType),
    residential,
    yearBuilt: fields.yearBuilt,
    financingType: financing,
    consumerMortgage: financing === "unknown" ? null : financing !== "cash",
    dualAgency: null,
    designatedSingleAgency: null,
    pmListing: hasListingAgreement ? includesPm(fields.brokerage) : null,
    pmTransaction: true,
    closed: status === "closed",
  });
}

export function correctionInputValue(fieldName: ReviewFieldKey, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}
