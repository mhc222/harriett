import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import type { z } from "zod";

// Sonnet 5: better than 4.5 and cheaper ($2/$10 per MTok intro through 2026-08-31,
// then $3/$15). Haiku carries the cheap tier: routing decisions, compliance flag
// checks, SHAFT/drift classification ($1/$5).
export const PRIMARY_MODEL = anthropic("claude-sonnet-5");
export const FAST_MODEL = anthropic("claude-haiku-4-5");
export const FALLBACK_MODEL = openai("gpt-5");

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
  const call = async (model: typeof PRIMARY_MODEL) => {
    const { object } = await generateObject({
      model,
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

  const primary = opts.tier === "fast" ? FAST_MODEL : PRIMARY_MODEL;
  try {
    return await call(primary);
  } catch (primaryError) {
    if (!process.env.OPENAI_API_KEY) throw primaryError;
    console.error("[ai] primary model failed, using fallback:", primaryError);
    return await call(FALLBACK_MODEL);
  }
}
