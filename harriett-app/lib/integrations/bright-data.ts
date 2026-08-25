import { z } from "zod";
import type { CmaSupplementalComparable } from "@/lib/cma";
import type { PropertyValueEstimate } from "@/lib/integrations/rentcast";

const BRIGHT_DATA_BASE_URL = "https://api.brightdata.com";
const DEFAULT_ZILLOW_DATASET_ID = "gd_lfqkr8wm13ixtbd8f5";
const REQUEST_TIMEOUT_MS = 20_000;

const OptionalNumber = z.preprocess(
  (value) => value === "" || value == null ? null : Number(value),
  z.number().finite().nullable()
).optional();
const OptionalString = z.preprocess(
  (value) => value == null ? null : String(value),
  z.string().nullable()
).optional();

const BrightDataAddressSchema = z.object({
  streetAddress: OptionalString,
  city: OptionalString,
  state: OptionalString,
  zipcode: OptionalString,
}).partial().passthrough();

export const BrightDataPropertyRecordSchema = z.object({
  zpid: z.union([z.string(), z.number()]).transform(String),
  address: BrightDataAddressSchema.nullable().optional(),
  streetAddress: OptionalString,
  city: OptionalString,
  state: OptionalString,
  zipcode: OptionalString,
  homeStatus: OptionalString,
  homeType: OptionalString,
  bedrooms: OptionalNumber,
  bathrooms: OptionalNumber,
  livingArea: OptionalNumber,
  livingAreaValue: OptionalNumber,
  yearBuilt: OptionalNumber,
  latitude: OptionalNumber,
  longitude: OptionalNumber,
  price: OptionalNumber,
  lastSoldPrice: OptionalNumber,
  dateSoldString: OptionalString,
  hdpUrl: z.string().url().nullable().optional(),
  zestimate: OptionalNumber,
  photoCount: OptionalNumber,
  timestamp: OptionalString,
}).passthrough();

export type BrightDataPropertyRecord = z.infer<typeof BrightDataPropertyRecordSchema>;

export const BrightDataEnrichmentResultSchema = z.object({
  snapshotId: z.string(),
  sourceResearchId: z.string().uuid(),
  observedRecordCount: z.number().int().nonnegative(),
  comparables: z.array(z.object({
    id: z.string(),
    source: z.literal("brightdata"),
    sourceUrl: z.string().url().nullable().optional(),
    formattedAddress: z.string(),
    propertyType: z.string().nullable().optional(),
    bedrooms: z.number().nullable().optional(),
    bathrooms: z.number().nullable().optional(),
    squareFootage: z.number().nullable().optional(),
    yearBuilt: z.number().nullable().optional(),
    status: z.string().nullable().optional(),
    lastSaleDate: z.string().nullable().optional(),
    price: z.number().positive(),
    distance: z.number().nullable().optional(),
    daysOld: z.number().nullable().optional(),
  })),
});

export interface BrightDataCandidateQuery {
  zipCode: string;
  state: string;
  bedrooms?: number | null;
  squareFootage?: number | null;
  recordsLimit?: number;
}

export class BrightDataError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "unauthorized" | "not_ready" | "invalid_response" | "upstream_error",
    readonly status: number
  ) {
    super(message);
    this.name = "BrightDataError";
  }
}

export function brightDataEnabled(): boolean {
  return process.env.BRIGHT_DATA_ENABLED === "true";
}

function apiToken(): string {
  if (!brightDataEnabled() || !process.env.BRIGHT_DATA_API_KEY) {
    throw new BrightDataError("Bright Data beta enrichment is not configured", "not_configured", 503);
  }
  return process.env.BRIGHT_DATA_API_KEY;
}

export function buildBrightDataCandidateFilter(input: BrightDataCandidateQuery) {
  const filters: Array<Record<string, unknown>> = [
    { name: "zipcode", operator: "=", value: input.zipCode },
    { name: "state", operator: "=", value: input.state.toUpperCase() },
    { name: "homeStatus", operator: "in", value: ["SOLD", "RECENTLY_SOLD"] },
  ];
  if (input.bedrooms != null) {
    filters.push(
      { name: "bedrooms", operator: ">=", value: Math.max(0, input.bedrooms - 1) },
      { name: "bedrooms", operator: "<=", value: input.bedrooms + 1 }
    );
  }
  if (input.squareFootage != null && input.squareFootage > 0) {
    filters.push(
      { name: "livingArea", operator: ">=", value: Math.round(input.squareFootage * 0.7) },
      { name: "livingArea", operator: "<=", value: Math.round(input.squareFootage * 1.3) }
    );
  }
  return {
    dataset_id: process.env.BRIGHT_DATA_ZILLOW_DATASET_ID ?? DEFAULT_ZILLOW_DATASET_ID,
    records_limit: Math.min(100, Math.max(10, input.recordsLimit ?? 50)),
    filter: { operator: "and", filters },
  };
}

export async function startBrightDataCandidateSnapshot(input: BrightDataCandidateQuery): Promise<string> {
  const response = await fetch(`${BRIGHT_DATA_BASE_URL}/datasets/filter`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildBrightDataCandidateFilter(input)),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 401 || response.status === 403) {
    throw new BrightDataError("Bright Data credentials were rejected", "unauthorized", 502);
  }
  if (!response.ok) {
    throw new BrightDataError("Bright Data could not start the candidate snapshot", "upstream_error", 502);
  }
  const parsed = z.object({ snapshot_id: z.string().min(1) }).safeParse(await response.json());
  if (!parsed.success) {
    throw new BrightDataError("Bright Data returned an invalid snapshot response", "invalid_response", 502);
  }
  return parsed.data.snapshot_id;
}

export async function downloadBrightDataSnapshot(snapshotId: string): Promise<{
  status: "pending" | "completed";
  records: BrightDataPropertyRecord[];
}> {
  const id = z.string().trim().min(1).max(200).parse(snapshotId);
  const response = await fetch(
    `${BRIGHT_DATA_BASE_URL}/datasets/snapshots/${encodeURIComponent(id)}/download?format=json`,
    {
      headers: { Authorization: `Bearer ${apiToken()}` },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
  );
  if (response.status === 400) {
    const body = await response.text();
    if (/not ready/i.test(body)) return { status: "pending", records: [] };
  }
  if (response.status === 401 || response.status === 403) {
    throw new BrightDataError("Bright Data credentials were rejected", "unauthorized", 502);
  }
  if (!response.ok) {
    throw new BrightDataError("Bright Data snapshot download failed", "upstream_error", 502);
  }
  const parsed = z.array(BrightDataPropertyRecordSchema).safeParse(await response.json());
  if (!parsed.success) {
    throw new BrightDataError("Bright Data returned invalid property records", "invalid_response", 502);
  }
  return { status: "completed", records: parsed.data };
}

function formatAddress(record: BrightDataPropertyRecord): string | null {
  const street = record.address?.streetAddress ?? record.streetAddress;
  const city = record.address?.city ?? record.city;
  const state = record.address?.state ?? record.state;
  const zip = record.address?.zipcode ?? record.zipcode;
  const address = [street, city, [state, zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return address || null;
}

function propertyType(homeType: string | null | undefined): string | null {
  if (!homeType) return null;
  const normalized = homeType.toUpperCase();
  if (normalized === "SINGLE_FAMILY") return "Single Family";
  if (normalized === "TOWNHOUSE") return "Townhouse";
  if (normalized === "CONDO") return "Condo";
  if (normalized === "MULTI_FAMILY") return "Multi-Family";
  if (normalized === "MANUFACTURED") return "Manufactured";
  return homeType.replaceAll("_", " ");
}

function distanceMiles(
  subject: { latitude?: number | null; longitude?: number | null },
  record: BrightDataPropertyRecord
): number | null {
  if (subject.latitude == null || subject.longitude == null || record.latitude == null || record.longitude == null) {
    return null;
  }
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const lat = radians(record.latitude - subject.latitude);
  const lon = radians(record.longitude - subject.longitude);
  const a = Math.sin(lat / 2) ** 2
    + Math.cos(radians(subject.latitude)) * Math.cos(radians(record.latitude)) * Math.sin(lon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function daysOld(date: string | null | undefined, effectiveDate: string): number | null {
  if (!date) return null;
  const observed = Date.parse(date);
  const effective = Date.parse(effectiveDate);
  if (!Number.isFinite(observed) || !Number.isFinite(effective)) return null;
  return Math.max(0, Math.round((effective - observed) / 86_400_000));
}

export function brightDataRecordsToCmaComparables(
  records: BrightDataPropertyRecord[],
  subject: PropertyValueEstimate["subjectProperty"],
  effectiveDate: string
): CmaSupplementalComparable[] {
  return records.flatMap((record) => {
    const address = formatAddress(record);
    const price = record.lastSoldPrice ?? record.price;
    if (!address || price == null || price <= 0) return [];
    return [{
      id: `brightdata:${record.zpid}`,
      source: "brightdata" as const,
      sourceUrl: record.hdpUrl ?? null,
      formattedAddress: address,
      propertyType: propertyType(record.homeType),
      bedrooms: record.bedrooms ?? null,
      bathrooms: record.bathrooms ?? null,
      squareFootage: record.livingArea ?? record.livingAreaValue ?? null,
      yearBuilt: record.yearBuilt ?? null,
      status: record.homeStatus ?? null,
      lastSaleDate: record.dateSoldString ?? null,
      price,
      distance: distanceMiles(subject, record),
      daysOld: daysOld(record.dateSoldString, effectiveDate),
    }];
  });
}
