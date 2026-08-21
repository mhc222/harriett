const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

export function embeddingModelId(): string {
  return process.env.AI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
}

export async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: embeddingModelId(), input: text.slice(0, 24_000) }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`embedding request failed (${response.status})`);
  }
  const payload = (await response.json()) as { data?: Array<{ embedding?: number[] }> };
  const embedding = payload.data?.[0]?.embedding;
  if (!embedding || embedding.length !== 1536) {
    throw new Error("embedding provider returned an unexpected vector");
  }
  return embedding;
}

export function vectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

