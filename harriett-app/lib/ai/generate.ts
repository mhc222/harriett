import { generateObject, NoObjectGeneratedError } from "ai";
import type { z } from "zod";
import {
  fallbackConfigured,
  modelForTier,
  modelIdForTier,
  type ModelTier,
} from "./models";

// Sonnet 5: better than 4.5 and cheaper ($2/$10 per MTok intro through 2026-08-31,
// then $3/$15). Haiku carries the cheap tier: routing decisions, compliance flag
// checks, SHAFT/drift classification ($1/$5).
export const PRIMARY_MODEL = modelForTier("standard");
export const FAST_MODEL = modelForTier("fast");
export const FALLBACK_MODEL = modelForTier("fallback");

type Content =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "file"; data: Uint8Array; mediaType: string }
    >;

// The one path for structured model output. Never JSON.parse raw model text.
// tier "fast" routes to Haiku for simple classification tasks; default is Sonnet.
// Falls back to the secondary provider on primary failure.
export async function generateStructured<T>(opts: {
  schema: z.ZodType<T>;
  system: string;
  content: Content;
  tier?: "standard" | "fast";
  maxOutputTokens?: number;
}): Promise<T> {
  const call = async (tier: ModelTier) => {
    const { object } = await generateObject({
      model: modelForTier(tier),
      schema: opts.schema,
      // AI SDK v7: system prompts go in `instructions`, not messages.
      instructions: {
        role: "system",
        content: opts.system,
        // Prompt caching: repeated calls reuse the system prompt at ~10% of
        // input price. Note Sonnet 5 only caches prefixes >= 1024 tokens, so
        // short prompts silently skip the cache until they grow (harmless).
        providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
      },
      messages: [{ role: "user", content: opts.content }],
      maxOutputTokens: opts.maxOutputTokens ?? 4096,
    });
    return object;
  };

  const callWithOutputRetry = async (tier: ModelTier) => {
    try {
      return await call(tier);
    } catch (error) {
      if (!NoObjectGeneratedError.isInstance(error)) throw error;
      console.warn(`[ai] ${modelIdForTier(tier)} returned no valid object, retrying once`);
      return call(tier);
    }
  };

  const primaryTier = opts.tier === "fast" ? "fast" : "standard";
  try {
    return await callWithOutputRetry(primaryTier);
  } catch (primaryError) {
    if (!fallbackConfigured()) throw primaryError;
    console.error(`[ai] ${modelIdForTier(primaryTier)} failed, using fallback`);
    return await callWithOutputRetry("fallback");
  }
}
