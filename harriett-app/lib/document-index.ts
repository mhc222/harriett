import type { SupabaseClient } from "@supabase/supabase-js";
import { embeddingModelId, embedTexts, vectorLiteral } from "@/lib/ai/embeddings";

export interface IndexableDocument {
  id: string;
  office_id: string;
  agent_id: string;
  deal_id: string | null;
  storage_path: string;
}

export interface DocumentIndexResult {
  documentId: string;
  totalPages: number;
  indexedPages: number;
  chunkCount: number;
  characterCount: number;
  extractionQuality: "good" | "weak" | "empty";
}

function normalizePageText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function ensurePromiseTry(): void {
  if (typeof Promise.try !== "function") {
    Object.defineProperty(Promise, "try", {
      configurable: true,
      value: (callback: (...args: unknown[]) => unknown, ...args: unknown[]) =>
        new Promise((resolve, reject) => {
          try {
            resolve(callback(...args));
          } catch (error) {
            reject(error);
          }
        }),
    });
  }
}

export async function extractPdfPages(bytes: Uint8Array): Promise<{
  totalPages: number;
  pages: string[];
}> {
  ensurePromiseTry();
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const extracted = await extractText(pdf, { mergePages: false });
  return { totalPages: extracted.totalPages, pages: extracted.text.map(normalizePageText) };
}

export function chunkDocumentPages(
  pages: string[],
  maxCharacters = 3_600,
  overlap = 300
): Array<{ pageNumber: number; content: string }> {
  const chunks: Array<{ pageNumber: number; content: string }> = [];
  for (const [pageIndex, raw] of pages.entries()) {
    const page = normalizePageText(raw);
    if (!page) continue;
    if (page.length <= maxCharacters) {
      chunks.push({ pageNumber: pageIndex + 1, content: page });
      continue;
    }
    let start = 0;
    while (start < page.length) {
      let end = Math.min(start + maxCharacters, page.length);
      if (end < page.length) {
        const boundary = Math.max(page.lastIndexOf("\n", end), page.lastIndexOf(". ", end));
        if (boundary > start + Math.floor(maxCharacters * 0.6)) end = boundary + 1;
      }
      chunks.push({ pageNumber: pageIndex + 1, content: page.slice(start, end).trim() });
      if (end >= page.length) break;
      start = Math.max(end - overlap, start + 1);
    }
  }
  return chunks;
}

function extractionQuality(totalPages: number, pages: string[], characters: number) {
  if (!characters) return "empty" as const;
  const pagesWithText = pages.filter((page) => normalizePageText(page).length >= 80).length;
  return characters / Math.max(totalPages, 1) >= 250 && pagesWithText / Math.max(totalPages, 1) >= 0.6
    ? "good" as const
    : "weak" as const;
}

export async function indexDealDocument(
  db: SupabaseClient,
  document: IndexableDocument,
  options?: { force?: boolean }
): Promise<DocumentIndexResult> {
  if (!options?.force) {
    const { count, error } = await db
      .from("document_chunks")
      .select("id", { count: "exact", head: true })
      .eq("document_id", document.id);
    if (error) throw new Error(`document index lookup failed: ${error.message}`);
    if (count) {
      const { data, error: statsError } = await db
        .from("document_chunks")
        .select("page_number, content")
        .eq("document_id", document.id);
      if (statsError) throw new Error(`document index stats failed: ${statsError.message}`);
      const pages = new Set((data ?? []).map((row) => row.page_number));
      const characters = (data ?? []).reduce((sum, row) => sum + row.content.length, 0);
      return {
        documentId: document.id,
        totalPages: Math.max(...pages, 0),
        indexedPages: pages.size,
        chunkCount: data?.length ?? 0,
        characterCount: characters,
        extractionQuality: characters ? "good" : "empty",
      };
    }
  }

  const { data: blob, error: downloadError } = await db.storage
    .from("documents")
    .download(document.storage_path);
  if (downloadError || !blob) throw new Error(`document download failed: ${downloadError?.message}`);
  const extracted = await extractPdfPages(new Uint8Array(await blob.arrayBuffer()));
  const pages = extracted.pages;
  const chunks = chunkDocumentPages(pages);
  const characters = pages.reduce((sum, page) => sum + page.length, 0);
  const quality = extractionQuality(extracted.totalPages, pages, characters);

  if (options?.force) {
    const { error } = await db.from("document_chunks").delete().eq("document_id", document.id);
    if (error) throw new Error(`old document index removal failed: ${error.message}`);
  }
  if (chunks.length) {
    let embeddings: number[][] | null = null;
    try {
      embeddings = await embedTexts(chunks.map((chunk) => chunk.content));
    } catch {
      embeddings = null;
    }
    const { error } = await db.from("document_chunks").insert(chunks.map((chunk, index) => ({
      office_id: document.office_id,
      document_id: document.id,
      deal_id: document.deal_id,
      agent_id: document.agent_id,
      page_number: chunk.pageNumber,
      chunk_index: index,
      content: chunk.content,
      token_count: Math.ceil(chunk.content.length / 4),
      embedding: embeddings?.[index] ? vectorLiteral(embeddings[index]) : null,
      embedding_model: embeddings?.[index] ? embeddingModelId() : null,
    })));
    if (error) throw new Error(`document index write failed: ${error.message}`);
  }

  return {
    documentId: document.id,
    totalPages: extracted.totalPages,
    indexedPages: new Set(chunks.map((chunk) => chunk.pageNumber)).size,
    chunkCount: chunks.length,
    characterCount: characters,
    extractionQuality: quality,
  };
}
