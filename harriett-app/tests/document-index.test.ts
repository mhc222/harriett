import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { chunkDocumentPages, extractPdfPages } from "@/lib/document-index";

describe("page-aware document indexing", () => {
  it("keeps page numbers while splitting long contract text", () => {
    const chunks = chunkDocumentPages([
      "Page one contract language.",
      `${"Long clause sentence. ".repeat(240)}Final language.`,
    ], 800, 80);

    expect(chunks[0]).toEqual({ pageNumber: 1, content: "Page one contract language." });
    expect(chunks.filter((chunk) => chunk.pageNumber === 2).length).toBeGreaterThan(1);
    expect(chunks.at(-1)?.content).toContain("Final language.");
  });

  it("extracts searchable text from the real purchase agreement fixture", async () => {
    const bytes = await readFile(new URL("./fixtures/gordo-purchase-agreement.pdf", import.meta.url));
    const extracted = await extractPdfPages(new Uint8Array(bytes));

    expect(extracted.totalPages).toBeGreaterThan(0);
    expect(extracted.pages).toHaveLength(extracted.totalPages);
    expect(extracted.pages.join(" ").length).toBeGreaterThan(1_000);
    expect(chunkDocumentPages(extracted.pages).every((chunk) => chunk.pageNumber > 0)).toBe(true);
  }, 20_000);
});
