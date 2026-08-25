import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PropertySearchInputSchema,
  RentCastError,
  getPropertyValueEstimate,
  getSoldPropertyComparables,
  getSaleListing,
  searchSaleListings,
} from "@/lib/integrations/rentcast";

const LISTING = {
  id: "123-Main-St,-Tuscaloosa,-AL-35401",
  formattedAddress: "123 Main St, Tuscaloosa, AL 35401",
  city: "Tuscaloosa",
  state: "AL",
  zipCode: "35401",
  propertyType: "Single Family",
  bedrooms: 3,
  bathrooms: 2,
  squareFootage: 1800,
  status: "Active",
  price: 325000,
  mlsName: "West Alabama MLS",
  mlsNumber: "123456",
};

describe("RentCast integration", () => {
  beforeEach(() => {
    process.env.RENTCAST_ENABLED = "true";
    process.env.RENTCAST_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RENTCAST_ENABLED;
    delete process.env.RENTCAST_API_KEY;
  });

  it("requires a bounded location", () => {
    expect(() => PropertySearchInputSchema.parse({ state: "AL" })).toThrow(
      /provide an address, zip code, or city and state/
    );
  });

  it("builds a filtered sale listing search and returns the total", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([LISTING]), {
        status: 200,
        headers: { "Content-Type": "application/json", "X-Total-Count": "42" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchSaleListings({
      city: "Tuscaloosa",
      state: "al",
      propertyTypes: ["Single Family", "Townhouse"],
      minPrice: 200000,
      maxPrice: 400000,
      minBedrooms: 3,
      maxResults: 8,
    });

    expect(result.totalCount).toBe(42);
    expect(result.listings[0].mlsNumber).toBe("123456");
    const requestUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(requestUrl.pathname).toBe("/v1/listings/sale");
    expect(requestUrl.searchParams.get("city")).toBe("Tuscaloosa");
    expect(requestUrl.searchParams.get("state")).toBe("AL");
    expect(requestUrl.searchParams.get("propertyType")).toBe("Single Family|Townhouse");
    expect(requestUrl.searchParams.get("price")).toBe("200000:400000");
    expect(requestUrl.searchParams.get("bedrooms")).toBe("3:*");
    expect(requestUrl.searchParams.get("limit")).toBe("8");
    expect(fetchMock.mock.calls[0][1].headers["X-Api-Key"]).toBe("test-key");
  });

  it("encodes a RentCast listing id before lookup", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(LISTING), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await getSaleListing("123 Main St/Tuscaloosa");

    expect(fetchMock.mock.calls[0][0]).toContain("123%20Main%20St%2FTuscaloosa");
  });

  it("validates value estimates before returning comps", async () => {
    const estimate = {
      price: 310000,
      priceRangeLow: 290000,
      priceRangeHigh: 335000,
      subjectProperty: {
        id: LISTING.id,
        formattedAddress: LISTING.formattedAddress,
        propertyType: LISTING.propertyType,
      },
      comparables: [
        {
          id: "125-Main-St,-Tuscaloosa,-AL-35401",
          formattedAddress: "125 Main St, Tuscaloosa, AL 35401",
          price: 315000,
          correlation: 0.97,
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(estimate), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getPropertyValueEstimate({
      address: "123 Main St, Tuscaloosa, AL 35401",
      compCount: 5,
    });

    expect(result.comparables).toHaveLength(1);
    const requestUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(requestUrl.pathname).toBe("/v1/avm/value");
    expect(requestUrl.searchParams.get("compCount")).toBe("5");
    expect(requestUrl.searchParams.get("lookupSubjectAttributes")).toBe("true");
  });

  it("retrieves nearby sold property records for CMA evidence", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{
        id: "sold-comp-1",
        formattedAddress: "125 Main St, Tuscaloosa, AL 35401",
        latitude: 33.21,
        longitude: -87.55,
        propertyType: "Single Family",
        bedrooms: 3,
        bathrooms: 2,
        squareFootage: 1900,
        yearBuilt: 2002,
        lastSaleDate: new Date(Date.now() - 30 * 86_400_000).toISOString(),
        lastSalePrice: 315000,
      }]), { status: 200, headers: { "Content-Type": "application/json" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getSoldPropertyComparables(
      { address: LISTING.formattedAddress, compCount: 10 },
      {
        id: LISTING.id,
        formattedAddress: LISTING.formattedAddress,
        latitude: 33.2,
        longitude: -87.55,
        propertyType: "Single Family",
        bedrooms: 3,
        bathrooms: 2,
        squareFootage: 1800,
      }
    );

    expect(result[0]).toMatchObject({
      id: "sold-comp-1",
      source: "rentcast",
      status: "Sold",
      price: 315000,
    });
    expect(result[0].distance).toBeGreaterThan(0);
    const requestUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(requestUrl.pathname).toBe("/v1/properties");
    expect(requestUrl.searchParams.get("saleDateRange")).toBe("365");
    expect(requestUrl.searchParams.get("bedrooms")).toBe("2:4");
    expect(requestUrl.searchParams.get("squareFootage")).toBe("1350:2250");
  });

  it("fails closed when RentCast changes its response shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ id: "missing-required-fields" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    await expect(
      searchSaleListings({ city: "Tuscaloosa", state: "AL" })
    ).rejects.toMatchObject({ code: "invalid_response" } satisfies Partial<RentCastError>);
  });

  it("does not make a request without a configured key", async () => {
    delete process.env.RENTCAST_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      searchSaleListings({ city: "Tuscaloosa", state: "AL" })
    ).rejects.toMatchObject({ code: "not_configured" } satisfies Partial<RentCastError>);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not make a request while RentCast is disabled", async () => {
    process.env.RENTCAST_ENABLED = "false";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      searchSaleListings({ city: "Tuscaloosa", state: "AL" })
    ).rejects.toMatchObject({ code: "not_configured" } satisfies Partial<RentCastError>);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
