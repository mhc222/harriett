import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GooglePlacesError,
  resolveAddress,
  suggestAddresses,
} from "@/lib/integrations/google-places";

describe("Google Places address lookup", () => {
  beforeEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_MAPS_API_KEY;
  });

  it("maps Tuscaloosa-biased address predictions", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      suggestions: [{
        placePrediction: {
          placeId: "places/test",
          text: { text: "2320 Starlight Drive, Tuscaloosa, AL, USA" },
          structuredFormat: {
            mainText: { text: "2320 Starlight Drive" },
            secondaryText: { text: "Tuscaloosa, AL, USA" },
          },
        },
      }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(suggestAddresses("2320 Starlight", crypto.randomUUID())).resolves.toEqual([{
      placeId: "places/test",
      fullText: "2320 Starlight Drive, Tuscaloosa, AL, USA",
      mainText: "2320 Starlight Drive",
      secondaryText: "Tuscaloosa, AL, USA",
    }]);
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.includedRegionCodes).toEqual(["US"]);
    expect(request.locationBias.circle.center).toEqual({ latitude: 33.2098, longitude: -87.5692 });
  });

  it("resolves a selection to the provider-formatted address", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "places/test",
      formattedAddress: "2320 Starlight Dr, Tuscaloosa, AL 35405, USA",
    }), { status: 200 })));

    await expect(resolveAddress("places/test", crypto.randomUUID())).resolves.toBe(
      "2320 Starlight Dr, Tuscaloosa, AL 35405, USA"
    );
  });

  it("fails closed when the provider key is absent", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    await expect(suggestAddresses("2320 Starlight", crypto.randomUUID())).rejects.toMatchObject({
      code: "not_configured",
      status: 503,
    } satisfies Partial<GooglePlacesError>);
  });
});
