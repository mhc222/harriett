import { describe, expect, it } from "vitest";
import { routeContext, sourceAuthority } from "@/lib/memory/routing";

describe("memory context routing", () => {
  it("uses structured data as the authority for deal questions", () => {
    const route = routeContext({
      intent: "deal_lookup",
      needsKnowledge: false,
      needsMemory: true,
      dealAddressHint: "123 Main Street",
      requestedMutation: false,
    });

    expect(route.sources).toContain("structured");
    expect(route.sources).toContain("memory");
    expect(route.memoryIsAuthoritative).toBe(false);
    expect(sourceAuthority("structured")).toBeGreaterThan(sourceAuthority("memory"));
  });

  it("routes pilot email questions to the connected Google workspace", () => {
    const route = routeContext({
      intent: "email",
      needsKnowledge: false,
      needsMemory: false,
      dealAddressHint: null,
      requestedMutation: false,
    });

    expect(route.sources).toEqual(["google_workspace"]);
  });

  it("loads personal memory for writing without treating it as factual proof", () => {
    const route = routeContext({
      intent: "writing",
      needsKnowledge: false,
      needsMemory: false,
      dealAddressHint: null,
      requestedMutation: false,
    });

    expect(route.sources).toEqual(["memory"]);
    expect(route.useMemoryForPersonalization).toBe(true);
    expect(route.memoryIsAuthoritative).toBe(false);
  });
});
