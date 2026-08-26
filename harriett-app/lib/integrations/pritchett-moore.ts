import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const PRITCHETT_MOORE_ORIGIN = "https://www.pritchett-moore.com";

export const PublicListingMetadataSchema = z.object({
  provider: z.literal("pritchett_moore"),
  mlsNumber: z.string().min(1),
  url: z.string().url(),
  primaryImageUrl: z.string().url().nullable(),
  observedAt: z.string().datetime(),
});

export type PublicListingMetadata = z.infer<typeof PublicListingMetadataSchema>;

function decodeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function metaContent(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const propertyFirst = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i");
  const contentFirst = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "i");
  const match = html.match(propertyFirst) ?? html.match(contentFirst);
  return match?.[1] ? decodeHtmlAttribute(match[1]) : null;
}

function safePrimaryImage(value: string | null): string | null {
  if (!value) return null;
  const parsed = z.string().url().safeParse(value);
  if (!parsed.success) return null;
  const url = new URL(parsed.data);
  if (url.protocol !== "https:") return null;
  if (url.hostname !== "www.pritchett-moore.com" && !url.hostname.endsWith(".caboosecms.com")) return null;
  return url.toString();
}

export async function findPritchettMooreListing(input: {
  mlsNumber: string;
  fetchImpl?: typeof fetch;
}): Promise<PublicListingMetadata | null> {
  const mlsNumber = z.string().trim().regex(/^[A-Za-z0-9-]{3,30}$/).parse(input.mlsNumber);
  const expectedUrl = new URL(`/properties/${encodeURIComponent(mlsNumber)}/details`, PRITCHETT_MOORE_ORIGIN);
  const response = await (input.fetchImpl ?? fetch)(expectedUrl, {
    cache: "no-store",
    headers: { "User-Agent": "Harriett listing-link verifier/1.0" },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Pritchett-Moore listing lookup failed with status ${response.status}`);
  const html = await response.text();
  if (!html.toLowerCase().includes(`mls #${mlsNumber}`.toLowerCase())) return null;

  const canonicalCandidate = metaContent(html, "og:url") ?? expectedUrl.toString();
  const canonical = new URL(canonicalCandidate);
  if (canonical.origin !== PRITCHETT_MOORE_ORIGIN || canonical.pathname !== expectedUrl.pathname) return null;

  return PublicListingMetadataSchema.parse({
    provider: "pritchett_moore",
    mlsNumber,
    url: canonical.toString(),
    primaryImageUrl: safePrimaryImage(metaContent(html, "og:image")),
    observedAt: new Date().toISOString(),
  });
}

export async function savePritchettMooreListing(input: {
  db: SupabaseClient;
  officeId: string;
  propertyId: string;
  metadata: PublicListingMetadata;
}): Promise<void> {
  const metadata = PublicListingMetadataSchema.parse(input.metadata);
  const { data: property, error: lookupError } = await input.db
    .from("properties")
    .select("facts")
    .eq("id", input.propertyId)
    .eq("office_id", input.officeId)
    .single();
  if (lookupError || !property) throw new Error(`property listing metadata lookup failed: ${lookupError?.message}`);
  const facts = z.record(z.string(), z.unknown()).catch({}).parse(property.facts);
  const { error: updateError } = await input.db
    .from("properties")
    .update({
      facts: { ...facts, publicListing: metadata },
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.propertyId)
    .eq("office_id", input.officeId);
  if (updateError) throw new Error(`property listing metadata save failed: ${updateError.message}`);
}
