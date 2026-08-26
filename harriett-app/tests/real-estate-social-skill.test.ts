import { describe, expect, it } from "vitest";
import {
  createDeterministicRealEstateSocialDraft,
  finalizeRealEstateSocialDraft,
} from "@/lib/skills/real-estate-social";

const officialUrl = "https://www.pritchett-moore.com/properties/175589/details";

describe("real estate social creation skill", () => {
  it("adds the licensed brokerage and the actual listing agent attribution", () => {
    const result = finalizeRealEstateSocialDraft({
      message: "Five bedrooms on five acres in Tuscaloosa. Take a look at the full property details.",
      shareMode: "link_preview",
      officialListingUrl: officialUrl,
      postingAgentName: "Matt Cronin",
      listingAgentName: "Gail Butler",
      isTestData: true,
    });

    expect(result.message).toContain("Listed by Gail Butler with Pritchett-Moore Real Estate, LLC.");
    expect(result.message).not.toContain(officialUrl);
    expect(result.complianceNotes).toContain(
      "This is a test transaction. Verify the live listing status and attribution before approval.",
    );
  });

  it("includes the official URL exactly once for a verified photo post", () => {
    const result = finalizeRealEstateSocialDraft({
      message: `See the full listing here: ${officialUrl}`,
      shareMode: "listing_photo",
      officialListingUrl: officialUrl,
      postingAgentName: "Gail Butler",
      listingAgentName: "Gail Butler",
      isTestData: false,
    });

    expect(result.message.split(officialUrl)).toHaveLength(2);
    expect(result.message).toContain("Pritchett-Moore Real Estate, LLC");
  });

  it("normalizes em dashes out of generated social copy", () => {
    const result = finalizeRealEstateSocialDraft({
      message: "Room to grow—five bedrooms and four bathrooms.",
      shareMode: "link_preview",
      officialListingUrl: officialUrl,
      postingAgentName: "Gail Butler",
      listingAgentName: "Gail Butler",
      isTestData: false,
    });

    expect(result.message).not.toContain("—");
    expect(result.message).toContain("grow - five");
  });

  it("stops focused Fair Housing risk language before the review artifact is saved", () => {
    expect(() => finalizeRealEstateSocialDraft({
      message: "This safe neighborhood is perfect for families.",
      shareMode: "link_preview",
      officialListingUrl: officialUrl,
      postingAgentName: "Gail Butler",
      listingAgentName: "Gail Butler",
      isTestData: false,
    })).toThrow("Fair Housing review");
  });

  it("creates a non-empty verified-facts fallback when the writing model is unavailable", () => {
    const result = createDeterministicRealEstateSocialDraft({
      postType: "new_listing",
      postingAgentName: "Matt Cronin",
      listingAgentName: "Gail Butler",
      agentNotes: "",
      transaction: {
        address: "11417 Woodbank Ridge",
        city: "Tuscaloosa",
        state: "AL",
        status: "listing_active",
        listPrice: 998500,
        property: {
          bedrooms: 5,
          bathrooms: 4,
          squareFeet: 4998,
        },
      },
    });

    expect(result.message).toContain("11417 Woodbank Ridge");
    expect(result.message).toContain("$998,500");
    expect(result.message).toContain("Listed by Gail Butler");
    expect(result.message).toContain("#TuscaloosaRealEstate");
    expect(result.message.trim().length).toBeGreaterThan(100);
  });

  it("does not claim a property sold when closing is not verified", () => {
    const result = createDeterministicRealEstateSocialDraft({
      postType: "just_sold",
      postingAgentName: "Matt Cronin",
      listingAgentName: "Gail Butler",
      agentNotes: "",
      transaction: {
        address: "11417 Woodbank Ridge",
        city: "Tuscaloosa",
        state: "AL",
        status: "under_contract",
        property: {},
      },
    });

    expect(result.message).toContain("Property update");
    expect(result.message).not.toContain("Just sold");
    expect(result.factCheckNotes.join(" ")).toContain("does not say sold");
  });
});
