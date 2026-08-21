export interface RawMemoryCandidate {
  id?: string;
  content: string;
}

const MEM0_INSTRUCTIONS = `Only extract durable personal context about the real estate agent who is speaking to Harriett.

Allowed: writing style, working preferences, named relationship conventions, and standing instructions.

Never extract deal facts, transaction status, dates, deadlines, prices, property facts, document status, compliance conclusions, email contents, calendar events, contact records, consumer information, credentials, secrets, financial data, or health data. A one-time request is not automatically a standing preference. Extract only facts stated by the agent in the new messages.`;

let processorPromise: Promise<import("mem0ai/oss").Memory> | null = null;

export function mem0Configured(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function mem0Processor(): Promise<import("mem0ai/oss").Memory> {
  if (!mem0Configured()) {
    throw new Error("Mem0 OSS requires OPENAI_API_KEY for extraction embeddings");
  }
  if (!processorPromise) {
    process.env.MEM0_TELEMETRY = "false";
    processorPromise = import("mem0ai/oss").then(({ Memory }) => new Memory({
      llm: {
        provider: "openai",
        config: {
          apiKey: process.env.OPENAI_API_KEY!,
          model: process.env.MEM0_LLM_MODEL || "gpt-5-mini",
          temperature: 0.1,
        },
      },
      embedder: {
        provider: "openai",
        config: {
          apiKey: process.env.OPENAI_API_KEY!,
          model: process.env.AI_EMBEDDING_MODEL || "text-embedding-3-small",
        },
      },
      vectorStore: {
        provider: "supabase",
        config: {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          tableName: "mem0_vectors",
          embeddingColumnName: "embedding",
          metadataColumnName: "metadata",
          dimension: 1536,
        },
      },
      disableHistory: true,
      customInstructions: MEM0_INSTRUCTIONS,
    }));
  }
  return processorPromise;
}

export async function extractWithMem0(opts: {
  officeId: string;
  agentId: string;
  messageId: string;
  agentMessage: string;
  assistantResponse: string;
  channel: "sms" | "pwa";
}): Promise<RawMemoryCandidate[]> {
  const processor = await mem0Processor();
  const result = await processor.add([
    { role: "user", content: opts.agentMessage },
    { role: "assistant", content: opts.assistantResponse },
  ], {
    userId: opts.agentId,
    infer: true,
    metadata: {
      office_id: opts.officeId,
      agent_id: opts.agentId,
      source_message_id: opts.messageId,
      source_channel: opts.channel,
    },
  });

  return result.results
    .filter((item) => Boolean(item.memory?.trim()))
    .map((item) => ({ id: item.id, content: item.memory.trim() }));
}
