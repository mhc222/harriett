import { z } from "zod";

const RENTCAST_BASE_URL = "https://api.rentcast.io/v1";
const REQUEST_TIMEOUT_MS = 10_000;

export const PropertyTypeSchema = z.enum([
  "Single Family",
  "Condo",
  "Townhouse",
  "Manufactured",
  "Multi-Family",
  "Apartment",
  "Land",
]);

const OptionalString = z.string().nullable().optional();
const OptionalNumber = z.number().nullable().optional();

const ContactSchema = z
  .object({
    name: OptionalString,
    phone: OptionalString,
    email: OptionalString,
    website: OptionalString,
  })
  .nullable()
  .optional();

const ListingHistoryEntrySchema = z.object({
  event: OptionalString,
  price: OptionalNumber,
  listingType: OptionalString,
  listedDate: OptionalString,
  removedDate: OptionalString,
  daysOnMarket: OptionalNumber,
});

export const RentCastListingSchema = z.object({
  id: z.string().min(1),
  formattedAddress: z.string().min(1),
  addressLine1: OptionalString,
  addressLine2: OptionalString,
  city: OptionalString,
  state: OptionalString,
  zipCode: OptionalString,
  county: OptionalString,
  latitude: OptionalNumber,
  longitude: OptionalNumber,
  propertyType: OptionalString,
  bedrooms: OptionalNumber,
  bathrooms: OptionalNumber,
  squareFootage: OptionalNumber,
  lotSize: OptionalNumber,
  yearBuilt: OptionalNumber,
  hoa: z.object({ fee: OptionalNumber }).nullable().optional(),
  status: z.string().min(1),
  price: z.number().nonnegative(),
  listingType: OptionalString,
  listedDate: OptionalString,
  removedDate: OptionalString,
  createdDate: OptionalString,
  lastSeenDate: OptionalString,
  daysOnMarket: OptionalNumber,
  mlsName: OptionalString,
  mlsNumber: OptionalString,
  listingAgent: ContactSchema,
  listingOffice: ContactSchema,
  builder: z
    .object({
      name: OptionalString,
      development: OptionalString,
      phone: OptionalString,
      website: OptionalString,
    })
    .nullable()
    .optional(),
  history: z.record(z.string(), ListingHistoryEntrySchema).nullable().optional(),
});

export type RentCastListing = z.infer<typeof RentCastListingSchema>;

const RangeNumberSchema = z.coerce.number().finite().nonnegative();

export const PropertySearchInputSchema = z
  .object({
    address: z.string().trim().min(5).max(200).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    state: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase())
      .optional(),
    zipCode: z.string().trim().regex(/^\d{5}$/).optional(),
    radius: z.coerce.number().positive().max(100).optional(),
    propertyTypes: z.array(PropertyTypeSchema).min(1).max(7).optional(),
    minPrice: RangeNumberSchema.optional(),
    maxPrice: RangeNumberSchema.optional(),
    minBedrooms: RangeNumberSchema.optional(),
    maxBedrooms: RangeNumberSchema.optional(),
    minBathrooms: RangeNumberSchema.optional(),
    maxBathrooms: RangeNumberSchema.optional(),
    status: z.enum(["Active", "Inactive"]).default("Active"),
    maxResults: z.coerce.number().int().min(1).max(25).default(10),
    offset: z.coerce.number().int().min(0).max(10_000).default(0),
  })
  .superRefine((input, ctx) => {
    const hasLocation = Boolean(input.address || input.zipCode || (input.city && input.state));
    if (!hasLocation) {
      ctx.addIssue({
        code: "custom",
        message: "provide an address, zip code, or city and state",
        path: ["address"],
      });
    }
    if (input.city && !input.state) {
      ctx.addIssue({ code: "custom", message: "state is required with city", path: ["state"] });
    }
    if (input.radius && !input.address) {
      ctx.addIssue({
        code: "custom",
        message: "radius currently requires a center address",
        path: ["radius"],
      });
    }
    for (const [minimum, maximum, path] of [
      [input.minPrice, input.maxPrice, "maxPrice"],
      [input.minBedrooms, input.maxBedrooms, "maxBedrooms"],
      [input.minBathrooms, input.maxBathrooms, "maxBathrooms"],
    ] as const) {
      if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
        ctx.addIssue({ code: "custom", message: "maximum must be at least the minimum", path: [path] });
      }
    }
  });

export type PropertySearchInput = z.input<typeof PropertySearchInputSchema>;
export type ParsedPropertySearchInput = z.output<typeof PropertySearchInputSchema>;

export const PropertyValueInputSchema = z.object({
  address: z.string().trim().min(5).max(200),
  propertyType: PropertyTypeSchema.optional(),
  bedrooms: z.coerce.number().finite().nonnegative().optional(),
  bathrooms: z.coerce.number().finite().nonnegative().optional(),
  squareFootage: z.coerce.number().finite().positive().optional(),
  maxRadius: z.coerce.number().positive().max(50).optional(),
  daysOld: z.coerce.number().int().min(1).max(730).optional(),
  compCount: z.coerce.number().int().min(5).max(25).default(10),
});

export type PropertyValueInput = z.input<typeof PropertyValueInputSchema>;
export type ParsedPropertyValueInput = z.output<typeof PropertyValueInputSchema>;

const SubjectPropertySchema = z.object({
  id: z.string().min(1),
  formattedAddress: z.string().min(1),
  addressLine1: OptionalString,
  addressLine2: OptionalString,
  city: OptionalString,
  state: OptionalString,
  zipCode: OptionalString,
  county: OptionalString,
  latitude: OptionalNumber,
  longitude: OptionalNumber,
  propertyType: OptionalString,
  bedrooms: OptionalNumber,
  bathrooms: OptionalNumber,
  squareFootage: OptionalNumber,
  lotSize: OptionalNumber,
  yearBuilt: OptionalNumber,
  lastSaleDate: OptionalString,
  lastSalePrice: OptionalNumber,
});

const ComparableSchema = SubjectPropertySchema.extend({
  status: OptionalString,
  price: z.number().nonnegative(),
  listingType: OptionalString,
  listedDate: OptionalString,
  removedDate: OptionalString,
  lastSeenDate: OptionalString,
  daysOnMarket: OptionalNumber,
  distance: OptionalNumber,
  daysOld: OptionalNumber,
  correlation: OptionalNumber,
});

export const PropertyValueEstimateSchema = z.object({
  price: z.number().nonnegative(),
  priceRangeLow: z.number().nonnegative(),
  priceRangeHigh: z.number().nonnegative(),
  subjectProperty: SubjectPropertySchema,
  comparables: z.array(ComparableSchema),
});

export type PropertyValueEstimate = z.infer<typeof PropertyValueEstimateSchema>;

export const SoldComparableSchema = z.object({
  id: z.string(),
  source: z.literal("rentcast"),
  sourceUrl: z.null(),
  formattedAddress: z.string(),
  propertyType: OptionalString,
  bedrooms: OptionalNumber,
  bathrooms: OptionalNumber,
  squareFootage: OptionalNumber,
  yearBuilt: OptionalNumber,
  status: z.literal("Sold"),
  lastSaleDate: z.string(),
  price: z.number().positive(),
  distance: OptionalNumber,
  daysOld: z.number().int().nonnegative(),
});

export type SoldComparable = z.infer<typeof SoldComparableSchema>;

export const PropertyResearchResultSchema = PropertyValueEstimateSchema.extend({
  soldComparables: z.array(SoldComparableSchema).optional().default([]),
});

export class RentCastError extends Error {
  constructor(
    message: string,
    readonly code:
      | "not_configured"
      | "unauthorized"
      | "not_found"
      | "rate_limited"
      | "invalid_response"
      | "upstream_error",
    readonly status: number
  ) {
    super(message);
    this.name = "RentCastError";
  }
}

export function rentCastEnabled(): boolean {
  return process.env.RENTCAST_ENABLED !== "false";
}

function numericRange(minimum?: number, maximum?: number): string | undefined {
  if (minimum === undefined && maximum === undefined) return undefined;
  return `${minimum ?? "*"}:${maximum ?? "*"}`;
}

function setIfDefined(params: URLSearchParams, key: string, value: unknown): void {
  if (value !== undefined && value !== null && value !== "") {
    params.set(key, String(value));
  }
}

async function rentCastRequest<T>(path: string, schema: z.ZodType<T>): Promise<{
  data: T;
  totalCount?: number;
}> {
  if (!rentCastEnabled()) {
    throw new RentCastError("RentCast is disabled", "not_configured", 503);
  }

  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) {
    throw new RentCastError("RentCast is not configured", "not_configured", 503);
  }

  let response: Response;
  try {
    response = await fetch(`${RENTCAST_BASE_URL}${path}`, {
      headers: { Accept: "application/json", "X-Api-Key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new RentCastError("RentCast could not be reached", "upstream_error", 502);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new RentCastError("RentCast credentials were rejected", "unauthorized", 502);
    }
    if (response.status === 404) {
      throw new RentCastError("Property was not found", "not_found", 404);
    }
    if (response.status === 429) {
      throw new RentCastError("RentCast request limit reached", "rate_limited", 429);
    }
    throw new RentCastError("RentCast returned an error", "upstream_error", 502);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new RentCastError("RentCast returned invalid JSON", "invalid_response", 502);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    console.error("[rentcast] response validation failed", parsed.error.issues);
    throw new RentCastError("RentCast returned an unexpected response", "invalid_response", 502);
  }

  const totalHeader = response.headers.get("x-total-count");
  const totalCount = totalHeader ? Number.parseInt(totalHeader, 10) : undefined;
  return {
    data: parsed.data,
    totalCount: Number.isFinite(totalCount) ? totalCount : undefined,
  };
}

export async function searchSaleListings(input: PropertySearchInput): Promise<{
  listings: RentCastListing[];
  totalCount?: number;
}> {
  const parsed = PropertySearchInputSchema.parse(input);
  const params = new URLSearchParams();
  setIfDefined(params, "address", parsed.address);
  setIfDefined(params, "city", parsed.city);
  setIfDefined(params, "state", parsed.state);
  setIfDefined(params, "zipCode", parsed.zipCode);
  setIfDefined(params, "radius", parsed.radius);
  setIfDefined(params, "propertyType", parsed.propertyTypes?.join("|"));
  setIfDefined(params, "price", numericRange(parsed.minPrice, parsed.maxPrice));
  setIfDefined(params, "bedrooms", numericRange(parsed.minBedrooms, parsed.maxBedrooms));
  setIfDefined(params, "bathrooms", numericRange(parsed.minBathrooms, parsed.maxBathrooms));
  params.set("status", parsed.status);
  params.set("limit", String(parsed.maxResults));
  params.set("offset", String(parsed.offset));
  params.set("includeTotalCount", "true");

  const response = await rentCastRequest(
    `/listings/sale?${params.toString()}`,
    z.array(RentCastListingSchema)
  );
  return { listings: response.data, totalCount: response.totalCount };
}

export async function getSaleListing(id: string): Promise<RentCastListing> {
  const parsedId = z.string().trim().min(1).max(300).parse(id);
  const response = await rentCastRequest(
    `/listings/sale/${encodeURIComponent(parsedId)}`,
    RentCastListingSchema
  );
  return response.data;
}

export async function getPropertyValueEstimate(
  input: PropertyValueInput
): Promise<PropertyValueEstimate> {
  const parsed = PropertyValueInputSchema.parse(input);
  const params = new URLSearchParams({ address: parsed.address });
  setIfDefined(params, "propertyType", parsed.propertyType);
  setIfDefined(params, "bedrooms", parsed.bedrooms);
  setIfDefined(params, "bathrooms", parsed.bathrooms);
  setIfDefined(params, "squareFootage", parsed.squareFootage);
  setIfDefined(params, "maxRadius", parsed.maxRadius);
  setIfDefined(params, "daysOld", parsed.daysOld);
  params.set("compCount", String(parsed.compCount));
  params.set("lookupSubjectAttributes", "true");

  const response = await rentCastRequest(
    `/avm/value?${params.toString()}`,
    PropertyValueEstimateSchema
  );
  return response.data;
}

const SoldPropertyRecordSchema = z.object({
  id: z.string(),
  formattedAddress: z.string(),
  latitude: OptionalNumber,
  longitude: OptionalNumber,
  propertyType: OptionalString,
  bedrooms: OptionalNumber,
  bathrooms: OptionalNumber,
  squareFootage: OptionalNumber,
  yearBuilt: OptionalNumber,
  lastSaleDate: z.string(),
  lastSalePrice: z.number().positive(),
});

function haversineMiles(
  fromLatitude: number | null | undefined,
  fromLongitude: number | null | undefined,
  toLatitude: number | null | undefined,
  toLongitude: number | null | undefined
): number | null {
  if (fromLatitude == null || fromLongitude == null || toLatitude == null || toLongitude == null) {
    return null;
  }
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(toLatitude - fromLatitude);
  const longitudeDelta = radians(toLongitude - fromLongitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(fromLatitude)) * Math.cos(radians(toLatitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function getSoldPropertyComparables(
  input: PropertyValueInput,
  subject: PropertyValueEstimate["subjectProperty"]
): Promise<SoldComparable[]> {
  const parsed = PropertyValueInputSchema.parse(input);
  const params = new URLSearchParams({
    address: subject.formattedAddress,
    radius: String(parsed.maxRadius ?? 3),
    saleDateRange: String(parsed.daysOld ?? 365),
    limit: "25",
  });
  setIfDefined(params, "propertyType", subject.propertyType);
  if (subject.bedrooms != null) {
    params.set("bedrooms", `${Math.max(0, subject.bedrooms - 1)}:${subject.bedrooms + 1}`);
  }
  if (subject.bathrooms != null) {
    params.set("bathrooms", `${Math.max(0, subject.bathrooms - 1)}:${subject.bathrooms + 1}`);
  }
  if (subject.squareFootage != null) {
    params.set(
      "squareFootage",
      `${Math.round(subject.squareFootage * 0.75)}:${Math.round(subject.squareFootage * 1.25)}`
    );
  }

  const response = await rentCastRequest(`/properties?${params.toString()}`, z.array(SoldPropertyRecordSchema));
  const now = Date.now();
  return response.data
    .filter((property) => property.id !== subject.id)
    .map((property) => SoldComparableSchema.parse({
      id: property.id,
      source: "rentcast",
      sourceUrl: null,
      formattedAddress: property.formattedAddress,
      propertyType: property.propertyType,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      squareFootage: property.squareFootage,
      yearBuilt: property.yearBuilt,
      status: "Sold",
      lastSaleDate: property.lastSaleDate,
      price: property.lastSalePrice,
      distance: haversineMiles(
        subject.latitude,
        subject.longitude,
        property.latitude,
        property.longitude
      ),
      daysOld: Math.max(0, Math.floor((now - Date.parse(property.lastSaleDate)) / 86_400_000)),
    }));
}
