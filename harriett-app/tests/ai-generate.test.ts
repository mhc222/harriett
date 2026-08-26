import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  fallbackConfigured: false,
  generateObject: vi.fn(),
}));

vi.mock("ai", () => ({
  generateObject: mocks.generateObject,
  NoObjectGeneratedError: {
    isInstance: (error: unknown) => (
      typeof error === "object" && error !== null && "noObject" in error
    ),
  },
}));

vi.mock("@/lib/ai/models", () => ({
  fallbackConfigured: () => mocks.fallbackConfigured,
  modelForTier: (tier: string) => `${tier}-model`,
  modelIdForTier: (tier: string) => `${tier}-model`,
}));

import { generateStructured } from "@/lib/ai/generate";

describe("structured AI generation", () => {
  beforeEach(() => {
    mocks.fallbackConfigured = false;
    mocks.generateObject.mockReset();
  });

  it("retries once when the model returns no valid object", async () => {
    mocks.generateObject
      .mockRejectedValueOnce({ noObject: true })
      .mockResolvedValueOnce({ object: { message: "Ready" } });

    const result = await generateStructured({
      schema: z.object({ message: z.string() }),
      system: "Return a message.",
      content: "Create it.",
    });

    expect(result).toEqual({ message: "Ready" });
    expect(mocks.generateObject).toHaveBeenCalledTimes(2);
  });

  it("does not retry a non-output error on the same provider", async () => {
    const error = new Error("invalid API key");
    mocks.generateObject.mockRejectedValueOnce(error);

    await expect(generateStructured({
      schema: z.object({ message: z.string() }),
      system: "Return a message.",
      content: "Create it.",
    })).rejects.toBe(error);
    expect(mocks.generateObject).toHaveBeenCalledTimes(1);
  });

  it("uses the configured fallback after two empty primary responses", async () => {
    mocks.fallbackConfigured = true;
    mocks.generateObject
      .mockRejectedValueOnce({ noObject: true })
      .mockRejectedValueOnce({ noObject: true })
      .mockResolvedValueOnce({ object: { message: "Fallback ready" } });

    const result = await generateStructured({
      schema: z.object({ message: z.string() }),
      system: "Return a message.",
      content: "Create it.",
    });

    expect(result).toEqual({ message: "Fallback ready" });
    expect(mocks.generateObject).toHaveBeenCalledTimes(3);
    expect(mocks.generateObject.mock.calls[2][0].model).toBe("fallback-model");
  });
});
