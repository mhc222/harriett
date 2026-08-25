#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_MANIFEST = "knowledge/compliance-sources.json";
const DEFAULT_CHARS = 2800;
const OVERLAP_CHARS = 240;
const EMBEDDING_MODEL = process.env.AI_EMBEDDING_MODEL || "text-embedding-3-small";

function parseArgs(argv) {
  const args = {
    manifest: DEFAULT_MANIFEST,
    source: null,
    dryRun: false,
    noEmbeddings: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--manifest") args.manifest = argv[++i];
    else if (arg === "--source") args.source = argv[++i];
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--no-embeddings") args.noEmbeddings = true;
    else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function normalizeWhitespace(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function stripHtml(html) {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h1|h2|h3|h4|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n[ \t]+/g, "\n")
  );
}

function readPdfText(path) {
  const result = spawnSync("pdftotext", [path, "-"], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(`pdftotext failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`pdftotext exited ${result.status}: ${result.stderr}`);
  }
  return result.stdout;
}

async function readSourceText(source) {
  if (source.local_path) {
    const path = source.local_path;
    const ext = extname(path).toLowerCase();
    if (ext === ".pdf") {
      const text = readPdfText(path);
      return {
        storagePath: source.source_url || path,
        rawContent: text,
        text,
      };
    }
    const text = readFileSync(path, "utf8");
    return {
      storagePath: source.source_url || path,
      rawContent: text,
      text,
    };
  }

  if (!source.source_url) {
    throw new Error(`${source.id} has neither local_path nor source_url`);
  }

  const response = await fetch(source.source_url);
  if (!response.ok) {
    throw new Error(`${source.source_url} returned ${response.status}`);
  }
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();
  return {
    storagePath: source.source_url,
    rawContent: body,
    text: contentType.includes("html") ? stripHtml(body) : body,
  };
}

function pageNumberForOffset(pages, offset) {
  let total = 0;
  for (let i = 0; i < pages.length; i += 1) {
    total += pages[i].length + 1;
    if (offset <= total) return i + 1;
  }
  return pages.length || null;
}

function sectionTitle(line) {
  const trimmed = line.trim();
  if (/^Preamble$/i.test(trimmed)) return "Preamble";
  if (/^Duties to /i.test(trimmed)) return trimmed;
  if (/^Article\s+\d+/i.test(trimmed)) return trimmed;
  if (/^Standard of Practice\s+\d+-\d+/i.test(trimmed)) return trimmed;
  if (/^Explanatory Notes$/i.test(trimmed)) return trimmed;
  return null;
}

function chunkText(rawText, maxChars = DEFAULT_CHARS) {
  const pages = rawText.split("\f");
  const text = normalizeWhitespace(pages.join("\n"));
  const chunks = [];
  let current = {
    section: "Document",
    text: "",
    startOffset: 0,
  };
  let offset = 0;

  for (const line of text.split("\n")) {
    const heading = sectionTitle(line);
    if (heading && current.text.trim()) {
      chunks.push({ ...current, text: current.text.trim() });
      current = { section: heading, text: `${line}\n`, startOffset: offset };
    } else if (heading) {
      current.section = heading;
      current.text += `${line}\n`;
      current.startOffset = offset;
    } else {
      current.text += `${line}\n`;
    }
    offset += line.length + 1;
  }
  if (current.text.trim()) chunks.push({ ...current, text: current.text.trim() });

  const sized = [];
  for (const chunk of chunks) {
    if (chunk.text.length <= maxChars) {
      sized.push(chunk);
      continue;
    }
    let start = 0;
    let part = 1;
    while (start < chunk.text.length) {
      const end = Math.min(chunk.text.length, start + maxChars);
      sized.push({
        section: `${chunk.section} (${part})`,
        text: chunk.text.slice(start, end).trim(),
        startOffset: chunk.startOffset + start,
      });
      if (end === chunk.text.length) break;
      start = Math.max(0, end - OVERLAP_CHARS);
      part += 1;
    }
  }

  return sized.map((chunk, index) => ({
    chunk_index: index,
    section: chunk.section,
    page_number: pageNumberForOffset(pages, chunk.startOffset),
    content: chunk.text,
    token_count: Math.ceil(chunk.text.length / 4),
  }));
}

function hashText(text) {
  return createHash("sha256").update(text).digest("hex");
}

function vectorLiteral(values) {
  return `[${values.join(",")}]`;
}

async function embedText(text) {
  if (!process.env.OPENAI_API_KEY) return null;
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text.slice(0, 24000) }),
  });
  if (!response.ok) {
    throw new Error(`embedding request failed (${response.status})`);
  }
  const payload = await response.json();
  const embedding = payload.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length !== 1536) {
    throw new Error("embedding provider returned an unexpected vector");
  }
  return embedding;
}

function dbClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function findOrCreateSource(db, officeId, source) {
  let sourceQuery = db
    .from("knowledge_sources")
    .select("id, status")
    .eq("office_id", officeId);
  sourceQuery = source.source_url
    ? sourceQuery.eq("source_url", source.source_url)
    : sourceQuery.eq("title", source.title).is("source_url", null);
  const { data: existing, error: selectError } = await sourceQuery.maybeSingle();
  if (selectError) throw selectError;
  if (existing) {
    const { error } = await db
      .from("knowledge_sources")
      .update({
        title: source.title,
        kind: source.kind,
        authority: source.authority,
        effective_from: source.effective_from || null,
        effective_to: source.effective_to || null,
        metadata: {
          ...(source.metadata || {}),
          manifest_id: source.id,
          publisher: source.publisher,
          jurisdiction: source.jurisdiction,
          notes: source.notes,
        },
        updated_at: new Date().toISOString(),
        ...(source.metadata?.review_on_change ? {} : { status: source.status }),
      })
      .eq("id", existing.id);
    if (error) throw error;
    return { id: existing.id, status: existing.status, existed: true };
  }

  const { data, error } = await db
    .from("knowledge_sources")
    .insert({
      office_id: officeId,
      title: source.title,
      kind: source.kind,
      authority: source.authority,
      status: source.status,
      source_url: source.source_url || null,
      effective_from: source.effective_from || null,
      effective_to: source.effective_to || null,
      metadata: {
        ...(source.metadata || {}),
        manifest_id: source.id,
        publisher: source.publisher,
        jurisdiction: source.jurisdiction,
        notes: source.notes,
      },
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id, status: source.status, existed: false };
}

async function nextVersion(db, sourceId) {
  const { data, error } = await db
    .from("knowledge_versions")
    .select("version")
    .eq("source_id", sourceId)
    .order("version", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.version || 0) + 1;
}

async function hashExists(db, sourceId, contentHash) {
  const { data, error } = await db
    .from("knowledge_versions")
    .select("id, version")
    .eq("source_id", sourceId)
    .eq("content_hash", contentHash)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function insertSource(
  db,
  officeId,
  source,
  chunks,
  storagePath,
  rawContent,
  contentHash,
  options
) {
  const sourceRecord = await findOrCreateSource(db, officeId, source);
  const sourceId = sourceRecord.id;
  const existingVersion = await hashExists(db, sourceId, contentHash);
  if (existingVersion) {
    return {
      sourceId,
      versionId: existingVersion.id,
      version: existingVersion.version,
      skipped: true,
    };
  }

  const version = await nextVersion(db, sourceId);
  const nextStatus =
    sourceRecord.existed && source.metadata?.review_on_change
      ? "review"
      : source.status;
  if (nextStatus !== sourceRecord.status) {
    const { error: statusError } = await db
      .from("knowledge_sources")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", sourceId);
    if (statusError) throw statusError;
  }
  const { data: versionRow, error: versionError } = await db
    .from("knowledge_versions")
    .insert({
      office_id: officeId,
      source_id: sourceId,
      version,
      storage_path: storagePath,
      raw_content: rawContent,
      source_content_type: source.content_type || "text/plain",
      retrieved_at: new Date().toISOString(),
      content_hash: contentHash,
      published_at: nextStatus === "published" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (versionError) throw versionError;

  for (const chunk of chunks) {
    let embedding = null;
    if (!options.noEmbeddings) {
      embedding = await embedText(chunk.content);
    }
    const { error } = await db.from("knowledge_chunks").insert({
      office_id: officeId,
      source_id: sourceId,
      version_id: versionRow.id,
      chunk_index: chunk.chunk_index,
      section: chunk.section,
      page_number: chunk.page_number,
      content: chunk.content,
      token_count: chunk.token_count,
      embedding: embedding ? vectorLiteral(embedding) : null,
      embedding_model: embedding ? EMBEDDING_MODEL : null,
    });
    if (error) throw error;
  }

  return {
    sourceId,
    versionId: versionRow.id,
    version,
    skipped: false,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  loadDotEnv(resolve(".env.local"));

  const manifestPath = resolve(args.manifest);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const sources = args.source
    ? manifest.sources.filter((source) => source.id === args.source)
    : manifest.sources;
  if (!sources.length) throw new Error(`No sources matched ${args.source}`);

  const db = args.dryRun ? null : dbClient();
  for (const source of sources) {
    const { text, storagePath, rawContent } = await readSourceText(source);
    const normalized = normalizeWhitespace(text);
    const chunks = chunkText(normalized);
    const contentHash = hashText(normalized);
    const label = `${source.id}: ${chunks.length} chunks, sha256 ${contentHash.slice(0, 12)}`;

    if (args.dryRun) {
      console.log(`[dry-run] ${label}`);
      console.log(`  title: ${source.title}`);
      console.log(`  storage: ${storagePath || basename(source.source_url)}`);
      console.log(`  first section: ${chunks[0]?.section || "none"}`);
      continue;
    }

    const result = await insertSource(
      db,
      manifest.office_id,
      source,
      chunks,
      storagePath,
      rawContent,
      contentHash,
      args
    );
    const action = result.skipped ? "already current" : `inserted v${result.version}`;
    console.log(`${source.id}: ${action}, ${chunks.length} chunks`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
