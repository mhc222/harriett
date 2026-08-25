#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";

const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v2";
const AREC_ORIGIN = "https://arec.alabama.gov";
const LAW_LIST_URL = `${AREC_ORIGIN}/pages/laws/LawList.aspx?AspxAutoDetectCookieSupport=1`;
const LAW_SEARCH_URL = `${AREC_ORIGIN}/pages/laws/search.aspx?AspxAutoDetectCookieSupport=1`;
const CHANGES_URL = `${AREC_ORIGIN}/pages/laws/StatutoryChanges.aspx?AspxAutoDetectCookieSupport=1`;
const OFFICE_ID = "00000000-0000-0000-0000-000000000001";
const MIN_EXPECTED_LAW_RECORDS = 50;

function parseArgs(argv) {
  const args = {
    dryRun: false,
    noEmbeddings: false,
    publishCurrent: false,
    allowPartial: false,
    maxDocuments: null,
    browserSnapshotStdin: false,
    browserSnapshotPort: null,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--no-embeddings") args.noEmbeddings = true;
    else if (arg === "--publish-current") args.publishCurrent = true;
    else if (arg === "--allow-partial") args.allowPartial = true;
    else if (arg === "--browser-snapshot-stdin") args.browserSnapshotStdin = true;
    else if (arg === "--browser-snapshot-port") args.browserSnapshotPort = Number(argv[++index]);
    else if (arg === "--max-documents") args.maxDocuments = Number(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.maxDocuments !== null && (!Number.isInteger(args.maxDocuments) || args.maxDocuments < 1)) {
    throw new Error("--max-documents must be a positive integer");
  }
  if (
    args.browserSnapshotPort !== null &&
    (!Number.isInteger(args.browserSnapshotPort) || args.browserSnapshotPort < 1024 || args.browserSnapshotPort > 65535)
  ) {
    throw new Error("--browser-snapshot-port must be an integer from 1024 through 65535");
  }
  return args;
}

async function receiveBrowserSnapshot(port) {
  return new Promise((resolveSnapshot, rejectSnapshot) => {
    const server = createServer((request, response) => {
      if (request.method !== "POST" || request.url !== "/arec-snapshot") {
        response.writeHead(404).end();
        return;
      }
      const chunks = [];
      let size = 0;
      request.on("data", (chunk) => {
        size += chunk.length;
        if (size > 5 * 1024 * 1024) request.destroy(new Error("Browser snapshot exceeds 5 MB"));
        else chunks.push(chunk);
      });
      request.on("error", (error) => {
        server.close();
        rejectSnapshot(error);
      });
      request.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        response.writeHead(202, { "Content-Type": "application/json" });
        response.end('{"accepted":true}');
        server.close(() => resolveSnapshot(body));
      });
    });
    server.on("error", rejectSnapshot);
    server.listen(port, "127.0.0.1", () => {
      console.log(`Waiting for an AREC browser snapshot on 127.0.0.1:${port}`);
    });
  });
}

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

async function firecrawl(endpoint, body) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is required");
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(`${FIRECRAWL_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.success !== false) return payload.data ?? payload;

    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    if (retryable && attempt < 3) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 1500));
      continue;
    }
    throw new Error(
      `Firecrawl ${endpoint} failed (${response.status}): ${payload.error || "unknown error"}`
    );
  }
  throw new Error(`Firecrawl ${endpoint} failed after retries`);
}

export function normalizeArecUrl(value) {
  let url;
  try {
    url = new URL(value, AREC_ORIGIN);
  } catch {
    return null;
  }
  if (url.hostname.toLowerCase() !== "arec.alabama.gov") return null;
  url.hash = "";

  if (/\/pages\/laws\/ViewLaw\.aspx$/i.test(url.pathname)) {
    const lawSectionId = url.searchParams.get("LawSectionID");
    if (!lawSectionId || !/^\d+$/.test(lawSectionId)) return null;
    return `${AREC_ORIGIN}/pages/laws/ViewLaw.aspx?AspxAutoDetectCookieSupport=1&LawSectionID=${lawSectionId}`;
  }
  if (/\/docs\/.*\.pdf$/i.test(url.pathname)) {
    return `${AREC_ORIGIN}${url.pathname}${url.search}`;
  }
  if (/\/pages\/laws\/StatutoryChanges\.aspx$/i.test(url.pathname)) return CHANGES_URL;
  return null;
}

export function extractMarkdownLinks(markdown, baseUrl) {
  const links = [];
  const pattern = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const match of markdown.matchAll(pattern)) {
    try {
      links.push({ label: match[1].trim(), url: new URL(match[2], baseUrl).toString() });
    } catch {
      // Ignore malformed publisher links.
    }
  }
  return links;
}

export function cleanArecMarkdown(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  const startCandidates = [
    normalized.indexOf("# License Laws/Rules"),
    normalized.indexOf("# Statutory Changes"),
    normalized.indexOf("Category:"),
  ].filter((index) => index >= 0);
  const start = startCandidates.length ? Math.min(...startCandidates) : 0;
  const main = normalized.slice(start);
  const footerMatch = main.match(/\n(?:#{1,4}\s+)?(About Us|Navigate|Get in Touch)\s*\n/i);
  return (footerMatch ? main.slice(0, footerMatch.index) : main)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseEffectiveDate(text) {
  const match = text.match(
    /(?:effective(?:\s+on)?|effective_from)\s*[:\-]?\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/i
  );
  if (!match) return null;
  const parsed = new Date(`${match[1]} ${match[2]}, ${match[3]} 00:00:00 UTC`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString().slice(0, 10);
}

export function describeArecDocument({ url, markdown, label = "", publishCurrent = false }) {
  const content = cleanArecMarkdown(markdown);
  const isLaw = /\/ViewLaw\.aspx/i.test(url);
  const isPdf = /\.pdf(?:\?|$)/i.test(url);
  const sectionMatch = content.match(/^\s*Section\s+([\d.-]+)\.\s*([^\n]+)/im);
  const ruleMatch = content.match(/^\s*Rule\s+(790-X-[\d.-]+)\.\s*([^\n]+)/im);
  const appendixMatch = content.match(/^\s*(A-\d+)\.\s*([^\n]+)/im);
  const categoryMatch = content.match(/^\s*Category:\s*([^\n]+)/im);
  const citation = sectionMatch?.[1] || appendixMatch?.[1] || ruleMatch?.[1] || null;
  const citationTitle = sectionMatch?.[2] || appendixMatch?.[2] || ruleMatch?.[2] || null;
  const effectiveFrom = isLaw ? null : parseEffectiveDate(`${label}\n${content}`);
  const today = new Date().toISOString().slice(0, 10);
  const pending = /\b(proposed|pending|subject to change)\b/i.test(`${label}\n${content.slice(0, 800)}`);
  const future = Boolean(effectiveFrom && effectiveFrom > today);
  const lifecycle = pending ? "pending" : future ? "future" : isLaw ? "current" : "supporting";
  const documentType = sectionMatch
    ? "statute"
    : appendixMatch
      ? "appendix"
    : ruleMatch
      ? "rule"
      : /\bform\b/i.test(label)
        ? "form"
        : /\bact\s+\d{4}-\d+/i.test(label)
          ? "act"
          : isPdf
            ? "guidance"
            : "change_index";
  const title = citation
    ? `${citation} ${citationTitle}`
    : label || content.match(/^#\s+([^\n]+)/m)?.[1] || basename(new URL(url).pathname);
  const stableKey = citation || sha256(url).slice(0, 16);

  return {
    id: `arec-${slug(stableKey)}`,
    title: `AREC ${title}`,
    kind: documentType === "form" ? "form" : documentType === "appendix" ? "procedure" : "regulation",
    authority:
      documentType === "statute" ? 100 : documentType === "rule" ? 98 : documentType === "appendix" ? 94 : 96,
    status: publishCurrent && lifecycle === "current" ? "published" : "review",
    source_url: url,
    effective_from: effectiveFrom,
    publisher: "Alabama Real Estate Commission",
    jurisdiction: "Alabama",
    content_type: isPdf ? "application/pdf+markdown" : "text/markdown",
    notes:
      lifecycle === "current"
        ? "Current consolidated AREC law or rule. Any changed version requires review before use."
        : "AREC supporting, pending, or future material. Human review is required before publication.",
    metadata: {
      document_type: documentType,
      citation,
      category: categoryMatch?.[1]?.trim() || null,
      lifecycle,
      link_label: label || null,
      review_on_change: true,
    },
    content,
  };
}

function linksFromMap(data) {
  const links = Array.isArray(data.links) ? data.links : Array.isArray(data) ? data : [];
  return links.map((item) => (typeof item === "string" ? item : item.url)).filter(Boolean);
}

function scrapePayload(data) {
  const markdown = data.markdown || data.data?.markdown;
  if (typeof markdown !== "string" || !markdown.trim()) {
    throw new Error("Firecrawl returned an empty markdown document");
  }
  return { markdown, links: data.links || data.data?.links || [] };
}

async function scrape(url) {
  try {
    return scrapePayload(
      await firecrawl("/scrape", {
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        parsers: ["pdf"],
        removeBase64Images: true,
        blockAds: true,
        storeInCache: true,
        timeout: 120000,
      })
    );
  } catch (error) {
    throw new Error(`${error.message} [${url}]`);
  }
}

async function discoverDocuments() {
  const [mapped, lawSearch, changes] = await Promise.all([
    firecrawl("/map", {
      url: LAW_LIST_URL,
      sitemap: "skip",
      includeSubdomains: false,
      ignoreQueryParameters: false,
      ignoreCache: true,
      limit: 1000,
      timeout: 120000,
    }),
    scrape(LAW_SEARCH_URL),
    scrape(CHANGES_URL),
  ]);

  const discovered = new Map();
  const add = (rawUrl, label = "") => {
    const url = normalizeArecUrl(rawUrl);
    if (!url) return;
    const isPdf = /\.pdf(?:\?|$)/i.test(url);
    if (isPdf && !label) return;
    if (!discovered.has(url)) discovered.set(url, label);
  };

  for (const url of linksFromMap(mapped)) add(url);
  for (const link of extractMarkdownLinks(lawSearch.markdown, LAW_SEARCH_URL)) add(link.url, link.label);
  for (const link of extractMarkdownLinks(changes.markdown, CHANGES_URL)) add(link.url, link.label);
  for (const link of [...lawSearch.links, ...changes.links]) {
    add(typeof link === "string" ? link : link.url || link.href, link.title || link.text || "");
  }
  discovered.set(CHANGES_URL, "AREC Statutory Changes");
  return { discovered, changesMarkdown: changes.markdown };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function main() {
  const args = parseArgs(process.argv);
  loadDotEnv(resolve(".env.local"));
  let documents;
  if (args.browserSnapshotStdin || args.browserSnapshotPort !== null) {
    const snapshotText = args.browserSnapshotPort !== null
      ? await receiveBrowserSnapshot(args.browserSnapshotPort)
      : readFileSync(0, "utf8");
    const payload = JSON.parse(snapshotText);
    const records = Array.isArray(payload) ? payload : payload.records;
    if (!Array.isArray(records)) throw new Error("Browser snapshot must contain a records array");
    const unique = new Map();
    for (const record of records) {
      const url = normalizeArecUrl(record.url);
      if (url && /\/ViewLaw\.aspx/i.test(url) && typeof record.text === "string") {
        unique.set(url, record.text);
      }
    }
    if (unique.size < MIN_EXPECTED_LAW_RECORDS && !args.allowPartial) {
      throw new Error(
        `Completeness check failed: browser supplied ${unique.size} law records, expected at least ${MIN_EXPECTED_LAW_RECORDS}.`
      );
    }
    console.log(`Browser snapshot contains ${unique.size} unique AREC law records.`);
    documents = [...unique.entries()].map(([url, text], index) => {
      const document = describeArecDocument({
        url,
        markdown: text,
        publishCurrent: args.publishCurrent,
      });
      console.log(`[${index + 1}/${unique.size}] ${document.id}`);
      return document;
    });
  } else {
    const { discovered, changesMarkdown } = await discoverDocuments();
    const lawCount = [...discovered.keys()].filter((url) => /\/ViewLaw\.aspx/i.test(url)).length;
    const supportCount = discovered.size - lawCount;
    if (lawCount < MIN_EXPECTED_LAW_RECORDS && !args.allowPartial) {
      throw new Error(
        `Completeness check failed: discovered ${lawCount} law records, expected at least ${MIN_EXPECTED_LAW_RECORDS}. Use --allow-partial only for diagnostics.`
      );
    }

    let entries = [...discovered.entries()].sort(([left], [right]) => left.localeCompare(right));
    if (args.maxDocuments) entries = entries.slice(0, args.maxDocuments);
    console.log(`Discovered ${lawCount} law records and ${supportCount} AREC supporting documents.`);
    documents = await mapWithConcurrency(entries, 2, async ([url, label], index) => {
      const markdown = url === CHANGES_URL ? changesMarkdown : (await scrape(url)).markdown;
      const document = describeArecDocument({
        url,
        markdown,
        label,
        publishCurrent: args.publishCurrent,
      });
      console.log(`[${index + 1}/${entries.length}] ${document.id}`);
      return document;
    });
  }

  const tempDirectory = mkdtempSync(join(tmpdir(), "harriett-arec-"));
  try {
    const sources = documents.map((document) => {
      const snapshotPath = join(tempDirectory, `${document.id}.md`);
      writeFileSync(snapshotPath, document.content, "utf8");
      const source = { ...document };
      delete source.content;
      return { ...source, local_path: snapshotPath };
    });
    const manifestPath = join(tempDirectory, "manifest.json");
    writeFileSync(manifestPath, JSON.stringify({ office_id: OFFICE_ID, sources }, null, 2));

    const childArgs = ["scripts/knowledge/ingest-compliance-sources.mjs", "--manifest", manifestPath];
    if (args.dryRun) childArgs.push("--dry-run");
    if (args.noEmbeddings) childArgs.push("--no-embeddings");
    const result = spawnSync(process.execPath, childArgs, { stdio: "inherit", cwd: process.cwd() });
    if (result.status !== 0) throw new Error(`Knowledge ingestion exited ${result.status}`);
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
