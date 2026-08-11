import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import type { z } from "zod";

export const PRIMARY_MODEL = anthropic("claude-sonnet-4-5");
export const FALLBACK_MODEL = openai("gpt-5");

type Content =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "file"; data: Uint8Array; mediaType: string }
    >;

// The one path for structured model output. Never JSON.parse raw model text.
// Falls back to the secondary provider on primary failure.
export async function generateStructured<T>(opts: {
  schema: z.ZodType<T>;
  system: string;
  content: Content;
  maxOutputTokens?: number;
}): Promise<T> {
  const call = async (model: typeof PRIMARY_MODEL) => {
    const { object } = await generateObject({
      model,
      schema: opts.schema,
      system: opts.system,
      messages: [{ role: "user", content: opts.content }],
      maxOutputTokens: opts.maxOutputTokens ?? 4096,
    });
    return object;
  };

  try {
    return await call(PRIMARY_MODEL);
  } catch (primaryError) {
    if (!process.env.OPENAI_API_KEY) throw primaryError;
    console.error("[ai] primary model failed, using fallback:", primaryError);
    return await call(FALLBACK_MODEL);
  }
}
