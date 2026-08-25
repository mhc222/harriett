import { describe, expect, it } from "vitest";
import {
  BrightDataPropertyRecordSchema,
  brightDataRecordsToCmaComparables,
  buildBrightDataCandidateFilter,
} from "@/lib/integrations/bright-data";

describe("Bright Data beta integration", () => {
  it("builds a bounded sold-property filter around the subject", () => {
    const request = buildBrightDataCandidateFilter({
      zipCode: "35405",
      state: "al",
      bedrooms: 3,
      squareFootage: 2000,
      recordsLimit: 500,
    });
    expect(request.records_limit).toBe(100);
    expect(request.filter.filters).toEqual(expect.arrayContaining([
      { name: "zipcode", operator: "=", value: "35405" },
      { name: "homeStatus", operator: "in", value: ["SOLD", "RECENTLY_SOLD"] },
      { name: "livingArea", operator: ">=", value: 1400 },
      { name: "livingArea", operator: "<=", value: 2600 },
    ]));
  });

  it("allowlists CMA fields and ignores embedded media payloads", () => {
    const parsed = BrightDataPropertyRecordSchema.parse({
      zpid: 123,
      address: {
        streetAddress: "104 Main St",
        city: "Tuscaloosa",
        state: "AL",
        zipcode: "35405",
      },
      homeStatus: "RECENTLY_SOLD",
      homeType: "SINGLE_FAMILY",
      bedrooms: 3,
      bathrooms: 2,
      livingArea: 1900,
      yearBuilt: 2002,
      latitude: 33.2,
      longitude: -87.5,
      lastSoldPrice: 310000,
      dateSoldString: "2026-06-01",
      hdpUrl: "https://www.zillow.com/homedetails/example/123_zpid/",
      photos: [{ url: "https://photos.example/not-retained.jpg" }],
      description: "Not retained in the normalized CMA evidence.",
    });
    const normalized = brightDataRecordsToCmaComparables(
      [parsed],
      {
        id: "subject",
        formattedAddress: "100 Main St, Tuscaloosa, AL 35405",
        latitude: 33.2,
        longitude: -87.5,
      },
      "2026-08-24T12:00:00.000Z"
    );
    expect(normalized[0]).toMatchObject({
      id: "brightdata:123",
      source: "brightdata",
      formattedAddress: "104 Main St, Tuscaloosa, AL 35405",
      propertyType: "Single Family",
      price: 310000,
    });
    expect(normalized[0]).not.toHaveProperty("photos");
    expect(normalized[0]).not.toHaveProperty("description");
  });
});
