import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText, vectorLiteral } from "@/lib/ai/embeddings";
import type { KnowledgeCitation } from "@/lib/contracts/agent";

export interface KnowledgeResult extends KnowledgeCitation {
  content: string;
  authority: number;
  score: number | null;
}

const INJECTION_PATTERNS = [
  /ignore (all|any|the) previous instructions/i,
  /system prompt/i,
  /you are now/i,
  /do not follow/i,
  /developer message/i,
  /tool call/i,
];

export function containsPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

function excerpt(content: string): string {
  return content.length <= 360 ? content : `${content.slice(0, 357)}...`;
}

export async function searchKnowledge(opts: {
  db: SupabaseClient;
  officeId: string;
  query: string;
  limit?: number;
}): Promise<KnowledgeResult[]> {
  const limit = Math.min(opts.limit ?? 6, 12);
  let embedding: number[] | null = null;
  try {
    embedding = await embedText(opts.query);
  } catch {
    embedding = null;
  }

  if (embedding) {
    const { data, error } = await opts.db.rpc("hybrid_search_knowledge", {
      query_text: opts.query,
      query_embedding: vectorLiteral(embedding),
      requested_office_id: opts.officeId,
      match_count: limit,
    });
    if (!error && data) {
      return (data as Array<Record<string, unknown>>).map((row) => ({
        sourceId: row.source_id as string,
        title: row.title as string,
        section: (row.section as string | null) ?? null,
        pageNumber: (row.page_number as number | null) ?? null,
        effectiveDate: (row.effective_from as string | null) ?? null,
        excerpt: excerpt(row.content as string),
        content: row.content as string,
        authority: row.authority as number,
        score: row.score as number,
      }));
    }
  }

  const { data, error } = await opts.db
    .from("knowledge_chunks")
    .select("source_id, section, page_number, content, knowledge_sources!inner(title, authority, effective_from, status)")
    .eq("office_id", opts.officeId)
    .eq("knowledge_sources.status", "published")
    .textSearch("fts", opts.query, { type: "websearch", config: "english" })
    .limit(limit);
  if (error) throw new Error(`knowledge search failed: ${error.message}`);

  return (data ?? []).map((row) => {
    const relation = row.knowledge_sources as unknown as
      | { title: string; authority: number; effective_from: string | null }
      | Array<{ title: string; authority: number; effective_from: string | null }>;
    const source = Array.isArray(relation) ? relation[0] : relation;
    return {
      sourceId: row.source_id,
      title: source?.title ?? "Office knowledge",
      section: row.section,
      pageNumber: row.page_number,
      effectiveDate: source?.effective_from,
      excerpt: excerpt(row.content),
      content: row.content,
      authority: source?.authority ?? 0,
      score: null,
    };
  });
}

