import { createHash } from "node:crypto";
import { z } from "zod";

export const GmailPushEnvelopeSchema = z.object({
  message: z.object({
    data: z.string().min(1),
    messageId: z.string().min(1),
    publishTime: z.string().optional(),
  }),
  subscription: z.string().optional(),
});

export const GmailPushDataSchema = z.object({
  emailAddress: z.string().email(),
  historyId: z.string().regex(/^\d+$/),
});

export function decodeGmailPushData(data: string) {
  return GmailPushDataSchema.parse(
    JSON.parse(Buffer.from(data, "base64").toString("utf8"))
  );
}

export function hashGoogleChannelToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function headerValue(
  headers: Array<{ name: string; value: string }> | undefined,
  name: string
): string | null {
  return headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? null;
}

export function monitoredGmailRecipients(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  const recipients = [...new Set(value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean))];
  return z.array(z.string().email()).min(1).parse(recipients);
}

export function googleMailMatchesRecipients(
  message: { payload?: { headers: Array<{ name: string; value: string }> } },
  allowedRecipients: string[]
): boolean {
  if (allowedRecipients.length === 0) return true;
  const headers = message.payload?.headers;
  const recipientHeaders = [
    headerValue(headers, "To"),
    headerValue(headers, "Cc"),
  ].filter((value): value is string => Boolean(value));
  const addresses = recipientHeaders
    .flatMap((value) => value.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])
    .map((address) => address.toLowerCase());
  return allowedRecipients.some((recipient) => addresses.includes(recipient));
}

export function monitoredGmailQuery(allowedRecipients: string[]): string | undefined {
  if (allowedRecipients.length === 0) return undefined;
  if (allowedRecipients.length === 1) return `to:${allowedRecipients[0]}`;
  return `{${allowedRecipients.map((recipient) => `to:${recipient}`).join(" ")}}`;
}

function addressList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 100);
}

const CATEGORY_RULES: Array<{
  category: "transaction" | "lead" | "vendor" | "office" | "calendar" | "marketing" | "receipt";
  pattern: RegExp;
}> = [
  { category: "transaction", pattern: /\b(contract|closing|inspection|appraisal|earnest|title|listing agreement|offer|counteroffer|addendum|disclosure|dotloop)\b/i },
  { category: "lead", pattern: /\b(showing request|property inquiry|new lead|interested in|schedule a showing)\b/i },
  { category: "vendor", pattern: /\b(photograph|termite|home inspect|repair estimate|contractor|invoice from)\b/i },
  { category: "calendar", pattern: /\b(invitation|accepted:|declined:|calendar|meeting)\b/i },
  { category: "receipt", pattern: /\b(receipt|payment received|order confirmation|billing statement)\b/i },
  { category: "marketing", pattern: /\b(unsubscribe|newsletter|promotion|sale ends|marketing)\b/i },
  { category: "office", pattern: /\b(office meeting|broker update|staff meeting|commission)\b/i },
];

const URGENT_PATTERN = /\b(urgent|immediate|asap|time[- ]sensitive|deadline today|closing today)\b/i;
const ATTENTION_PATTERN = /\b(please review|please sign|signature needed|action required|respond by|due today|needs approval|confirm receipt)\b/i;

export function normalizeGoogleMailMetadata(message: {
  id: string;
  threadId?: string;
  labelIds: string[];
  snippet: string;
  historyId?: string;
  internalDate?: string;
  payload?: { headers: Array<{ name: string; value: string }> };
}) {
  const headers = message.payload?.headers;
  const sender = headerValue(headers, "From");
  const subject = headerValue(headers, "Subject");
  const searchable = `${sender ?? ""} ${subject ?? ""} ${message.snippet}`;
  const category = CATEGORY_RULES.find((rule) => rule.pattern.test(searchable))?.category ?? "other";
  const urgent = URGENT_PATTERN.test(searchable);
  const needsAttention = urgent || ATTENTION_PATTERN.test(searchable) || category === "lead";
  const internalMillis = message.internalDate ? Number(message.internalDate) : Number.NaN;
  const dateHeader = headerValue(headers, "Date");
  const receivedAt = Number.isFinite(internalMillis)
    ? new Date(internalMillis).toISOString()
    : dateHeader && !Number.isNaN(Date.parse(dateHeader))
      ? new Date(dateHeader).toISOString()
      : null;

  return {
    gmail_message_id: message.id,
    gmail_thread_id: message.threadId ?? null,
    gmail_history_id: message.historyId ?? null,
    internet_message_id: headerValue(headers, "Message-ID"),
    sender,
    recipients: addressList(headerValue(headers, "To")),
    cc: addressList(headerValue(headers, "Cc")),
    subject,
    snippet: message.snippet.slice(0, 1_000),
    label_ids: message.labelIds,
    category,
    priority: urgent ? "urgent" : needsAttention ? "high" : category === "marketing" ? "low" : "normal",
    needs_attention: needsAttention,
    received_at: receivedAt,
    source_url: `https://mail.google.com/mail/u/0/#all/${message.id}`,
    last_observed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as const;
}
