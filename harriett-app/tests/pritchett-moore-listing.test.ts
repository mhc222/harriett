import { describe, expect, it, vi } from "vitest";
import { findPritchettMooreListing } from "@/lib/integrations/pritchett-moore";

describe("Pritchett-Moore public listing resolver", () => {
  it("verifies and extracts the canonical listing page and primary image", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(`
      <html><head>
        <meta property="og:url" content="https://www.pritchett-moore.com/properties/175589/details" />
        <meta property="og:image" content="https://assets.caboosecms.com/media/woodbank.jpg?version=2" />
      </head><body><p>MLS #175589</p></body></html>
    `, { status: 200 }));

    const result = await findPritchettMooreListing({ mlsNumber: "175589", fetchImpl });

    expect(result).toMatchObject({
      provider: "pritchett_moore",
      mlsNumber: "175589",
      url: "https://www.pritchett-moore.com/properties/175589/details",
      primaryImageUrl: "https://assets.caboosecms.com/media/woodbank.jpg?version=2",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://www.pritchett-moore.com/properties/175589/details"),
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("does not save an unverified or missing property page", async () => {
    const missing = vi.fn<typeof fetch>().mockResolvedValue(new Response("not found", { status: 404 }));
    const mismatched = vi.fn<typeof fetch>().mockResolvedValue(new Response("<p>MLS #999999</p>", { status: 200 }));

    await expect(findPritchettMooreListing({ mlsNumber: "175589", fetchImpl: missing })).resolves.toBeNull();
    await expect(findPritchettMooreListing({ mlsNumber: "175589", fetchImpl: mismatched })).resolves.toBeNull();
  });
});
