import { afterEach, describe, expect, it } from "vitest";
import {
  hasForbiddenMemoryContent,
  normalizeMemoryContent,
} from "@/lib/memory/governance";
import { mem0Configured } from "@/lib/memory/mem0-processor";
import { memoryMode, shouldActivateCandidate } from "@/lib/memory/mode";
import { AgentTurnInputSchema } from "@/lib/contracts/agent";

const originalMemoryMode = process.env.MEMORY_MODE;
const originalOpenAiKey = process.env.OPENAI_API_KEY;
const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

afterEach(() => {
  if (originalMemoryMode === undefined) delete process.env.MEMORY_MODE;
  else process.env.MEMORY_MODE = originalMemoryMode;
  if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalOpenAiKey;
  if (originalSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
  if (originalServiceKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
});

describe("governed memory", () => {
  it("defaults to shadow mode", () => {
    delete process.env.MEMORY_MODE;
    expect(memoryMode()).toBe("shadow");
  });

  it("never activates a candidate in shadow mode", () => {
    expect(shouldActivateCandidate({
      mode: "shadow",
      sensitivity: "ordinary",
      explicit: true,
      confidence: 1,
    })).toBe(false);
  });

  it("activates only explicit, high-confidence ordinary candidates in governed mode", () => {
    expect(shouldActivateCandidate({
      mode: "governed",
      sensitivity: "ordinary",
      explicit: true,
      confidence: 0.95,
    })).toBe(true);
    expect(shouldActivateCandidate({
      mode: "governed",
      sensitivity: "sensitive",
      explicit: true,
      confidence: 0.99,
    })).toBe(false);
    expect(shouldActivateCandidate({
      mode: "governed",
      sensitivity: "ordinary",
      explicit: false,
      confidence: 0.99,
    })).toBe(false);
  });

  it("normalizes content for do-not-learn blocks", () => {
    expect(normalizeMemoryContent("  Keep MY texts short, please! ")).toBe(
      "keep my texts short please"
    );
  });

  it("blocks secrets and operational transaction facts", () => {
    expect(hasForbiddenMemoryContent("The closing date is September 12")).toBe(true);
    expect(hasForbiddenMemoryContent("My API key is abc123")).toBe(true);
    expect(hasForbiddenMemoryContent("The signed contract was received")).toBe(true);
    expect(hasForbiddenMemoryContent("Keep my text messages brief")).toBe(false);
  });

  it("enables Mem0 only when its embedder and storage configuration exist", () => {
    delete process.env.OPENAI_API_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    expect(mem0Configured()).toBe(false);

    process.env.OPENAI_API_KEY = "openai-key";
    expect(mem0Configured()).toBe(true);
  });

  it("accepts PostgreSQL UUID-shaped seeded tenant identifiers", () => {
    expect(() => AgentTurnInputSchema.parse({
      officeId: "00000000-0000-0000-0000-000000000001",
      agentId: "00000000-0000-0000-0001-000000000002",
      channel: "sms",
      message: "What needs my attention today?",
    })).not.toThrow();
  });
});
