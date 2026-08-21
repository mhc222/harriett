import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type ModelTier = "fast" | "standard" | "fallback";

const DEFAULT_MODELS: Record<ModelTier, string> = {
  fast: "claude-haiku-4-5",
  standard: "claude-sonnet-5",
  fallback: "gpt-5",
};

export function modelIdForTier(tier: ModelTier): string {
  const names: Record<ModelTier, string | undefined> = {
    fast: process.env.AI_FAST_MODEL,
    standard: process.env.AI_STANDARD_MODEL,
    fallback: process.env.AI_FALLBACK_MODEL,
  };
  return names[tier] || DEFAULT_MODELS[tier];
}

export function modelForTier(tier: ModelTier): LanguageModel {
  const id = modelIdForTier(tier);
  return tier === "fallback" ? openai(id) : anthropic(id);
}

export function fallbackConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export const PROMPT_VERSION = "agent-runtime-1";

