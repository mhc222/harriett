import { describe, expect, it } from "vitest";
import { formatAgentDealPortfolio } from "@/lib/agent-deals";

describe("formatAgentDealPortfolio", () => {
  it("summarizes active and under-contract files without a model", () => {
    const result = formatAgentDealPortfolio([
      {
        id: "11111111-1111-4111-8111-111111111111",
        address: "11417 Woodbank Ridge",
        city: "Tuscaloosa",
        status: "listing_active",
        listPrice: 998_500,
        salePrice: null,
        contractAcceptanceDate: null,
        closingDate: null,
        publicListingUrl: "https://www.pritchett-moore.com/properties/175589/details",
        primaryImageUrl: null,
        facebookArtifactId: "33333333-3333-4333-8333-333333333333",
        privateReviewUrl: "https://harriett.example/social?draft=33333333-3333-4333-8333-333333333333",
        liveFacebookUrl: "https://www.facebook.com/pritchettmoore/posts/123",
        facebookArtifactStatus: "published",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        address: "604 2nd St NW",
        city: "Gordo",
        status: "under_contract",
        listPrice: null,
        salePrice: 208_000,
        contractAcceptanceDate: "2026-04-30",
        closingDate: "2026-06-05",
        publicListingUrl: null,
        primaryImageUrl: null,
        facebookArtifactId: null,
        privateReviewUrl: null,
        liveFacebookUrl: null,
        facebookArtifactStatus: null,
      },
    ], new Date("2026-08-26T12:00:00Z"));

    expect(result).toContain("1 active listing and 1 file under contract");
    expect(result).toContain("11417 Woodbank Ridge, Tuscaloosa, Active listing, $998,500");
    expect(result).toContain(
      "604 2nd St NW, Gordo, Under contract, $208,000, recorded closing Jun 5, 2026, status needs review"
    );
  });

  it("states plainly when there are no current records", () => {
    expect(formatAgentDealPortfolio([]))
      .toBe("I don’t see any current transaction records assigned to you.");
  });
});
