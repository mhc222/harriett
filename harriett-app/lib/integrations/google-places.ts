import { z } from "zod";

const TUSCALOOSA_CENTER = { latitude: 33.2098, longitude: -87.5692 };
const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1";

const predictionSchema = z.object({
  placePrediction: z.object({
    placeId: z.string(),
    text: z.object({ text: z.string() }),
    structuredFormat: z.object({
      mainText: z.object({ text: z.string() }),
      secondaryText: z.object({ text: z.string() }).optional(),
    }).optional(),
  }).optional(),
});

const autocompleteResponseSchema = z.object({
  suggestions: z.array(predictionSchema).default([]),
});

const placeResponseSchema = z.object({
  id: z.string(),
  formattedAddress: z.string(),
});

export interface AddressSuggestion {
  placeId: string;
  fullText: string;
  mainText: string;
  secondaryText: string;
}

export class GooglePlacesError extends Error {
  constructor(
    message: string,
    public readonly code: "not_configured" | "provider_error" | "invalid_response",
    public readonly status: number
  ) {
    super(message);
    this.name = "GooglePlacesError";
  }
}

function apiKey(): string {
  const value = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!value) throw new GooglePlacesError("Address suggestions are not configured.", "not_configured", 503);
  return value;
}

async function googleRequest(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey(),
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    console.error("Google Places request failed", response.status, await response.text());
    throw new GooglePlacesError("Google could not complete the address lookup.", "provider_error", 502);
  }
  return response.json();
}

export async function suggestAddresses(input: string, sessionToken: string): Promise<AddressSuggestion[]> {
  const payload = await googleRequest(`${GOOGLE_PLACES_URL}/places:autocomplete`, {
    method: "POST",
    headers: {
      "x-goog-fieldmask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
    },
    body: JSON.stringify({
      input,
      sessionToken,
      includedRegionCodes: ["US"],
      locationBias: {
        circle: {
          center: TUSCALOOSA_CENTER,
          radius: 50000,
        },
      },
      languageCode: "en",
      regionCode: "US",
      includeQueryPredictions: false,
    }),
  });
  const parsed = autocompleteResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new GooglePlacesError("Google returned an unexpected address response.", "invalid_response", 502);
  }
  return parsed.data.suggestions.flatMap((suggestion) => {
    const prediction = suggestion.placePrediction;
    if (!prediction) return [];
    return [{
      placeId: prediction.placeId,
      fullText: prediction.text.text,
      mainText: prediction.structuredFormat?.mainText.text ?? prediction.text.text,
      secondaryText: prediction.structuredFormat?.secondaryText?.text ?? "",
    }];
  });
}

export async function resolveAddress(placeId: string, sessionToken: string): Promise<string> {
  const params = new URLSearchParams({ sessionToken, languageCode: "en", regionCode: "US" });
  const payload = await googleRequest(
    `${GOOGLE_PLACES_URL}/places/${encodeURIComponent(placeId)}?${params}`,
    {
      method: "GET",
      headers: { "x-goog-fieldmask": "id,formattedAddress" },
    }
  );
  const parsed = placeResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new GooglePlacesError("Google returned an unexpected property address.", "invalid_response", 502);
  }
  return parsed.data.formattedAddress;
}
