const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

export function embeddingModelId(): string {
  return process.env.AI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
}

export async function embedText(text: string): Promise<number[] | null> {
  const results = await embedTexts([text]);
  return results?.[0] ?? null;
}

export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!texts.length) return [];

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: embeddingModelId(),
      input: texts.map((text) => text.slice(0, 24_000)),
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`embedding request failed (${response.status})`);
  }
  const payload = (await response.json()) as {
    data?: Array<{ index?: number; embedding?: number[] }>;
  };
  const ordered = [...(payload.data ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const embeddings = ordered.map((item) => item.embedding);
  if (
    embeddings.length !== texts.length ||
    embeddings.some((embedding) => !embedding || embedding.length !== 1536)
  ) {
    throw new Error("embedding provider returned an unexpected vector");
  }
  return embeddings as number[][];
}

export function vectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
