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
      },
    ]);

    expect(result).toContain("1 active listing and 1 file under contract");
    expect(result).toContain("11417 Woodbank Ridge, Tuscaloosa, Active listing, $998,500");
    expect(result).toContain("604 2nd St NW, Gordo, Under contract, $208,000, closing Jun 5, 2026");
  });

  it("states plainly when there are no current records", () => {
    expect(formatAgentDealPortfolio([]))
      .toBe("I don’t see any current transaction records assigned to you.");
  });
});
