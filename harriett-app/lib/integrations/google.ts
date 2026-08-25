import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_CALENDAR_URL = "https://www.googleapis.com/calendar/v3";
const GOOGLE_GMAIL_URL = "https://gmail.googleapis.com/gmail/v1";
const TOKEN_AAD = Buffer.from("harriett:google:v1", "utf8");

export const GOOGLE_OAUTH_STATE_COOKIE = "harriett_google_oauth_state";

export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
] as const;

export const GoogleTokenBundleSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: z.number().int().positive().nullable(),
  tokenType: z.string().min(1),
  scopes: z.array(z.string().min(1)),
});

export type GoogleTokenBundle = z.infer<typeof GoogleTokenBundleSchema>;

export const GoogleIdentitySchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
});

export type GoogleIdentity = z.infer<typeof GoogleIdentitySchema>;

export interface EncryptedGoogleTokens {
  tokenCiphertext: string;
  tokenIv: string;
  tokenTag: string;
}

export const GoogleCalendarSchema = z.object({
  id: z.string().min(1),
  summary: z.string().default("Calendar"),
  primary: z.boolean().optional(),
  accessRole: z.string().optional(),
  timeZone: z.string().optional(),
});

export const GoogleCalendarEventSchema = z.object({
  id: z.string().min(1),
  status: z.string().optional(),
  htmlLink: z.string().url().optional(),
  summary: z.string().default("Untitled event"),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.object({ date: z.string().optional(), dateTime: z.string().optional(), timeZone: z.string().optional() }),
  end: z.object({ date: z.string().optional(), dateTime: z.string().optional(), timeZone: z.string().optional() }),
});

export const GoogleCalendarEventInputSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  description: z.string().max(10_000).optional(),
  location: z.string().max(1_000).optional(),
  start: z.object({
    date: z.string().date().optional(),
    dateTime: z.string().datetime({ offset: true }).optional(),
    timeZone: z.string().min(1).optional(),
  }).refine((value) => Boolean(value.date) !== Boolean(value.dateTime), "provide either date or dateTime"),
  end: z.object({
    date: z.string().date().optional(),
    dateTime: z.string().datetime({ offset: true }).optional(),
    timeZone: z.string().min(1).optional(),
  }).refine((value) => Boolean(value.date) !== Boolean(value.dateTime), "provide either date or dateTime"),
  attendees: z.array(z.object({ email: z.string().email() })).max(100).optional(),
});

export type GoogleCalendarEventInput = z.infer<typeof GoogleCalendarEventInputSchema>;

export const GoogleEmailInputSchema = z.object({
  to: z.array(z.string().email()).min(1).max(50),
  cc: z.array(z.string().email()).max(50).optional(),
  bcc: z.array(z.string().email()).max(50).optional(),
  subject: z.string().trim().min(1).max(998),
  text: z.string().min(1).max(500_000),
  replyTo: z.string().email().optional(),
});

export type GoogleEmailInput = z.infer<typeof GoogleEmailInputSchema>;

export class GoogleIntegrationError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 500
  ) {
    super(message);
    this.name = "GoogleIntegrationError";
  }
}

function configuredValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new GoogleIntegrationError(`${name} is not configured`, "not_configured", 503);
  return value;
}

export function googleIntegrationConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
    && process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()
    && process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim()
    && process.env.CONNECTION_ENCRYPTION_KEY?.trim()
  );
}

function connectionKey(encodedKey = configuredValue("CONNECTION_ENCRYPTION_KEY")): Buffer {
  const key = /^[a-f0-9]{64}$/i.test(encodedKey)
    ? Buffer.from(encodedKey, "hex")
    : Buffer.from(encodedKey, "base64");
  if (key.length !== 32) {
    throw new GoogleIntegrationError(
      "CONNECTION_ENCRYPTION_KEY must decode to exactly 32 bytes",
      "invalid_encryption_key",
      500
    );
  }
  return key;
}

function oauthClient(): OAuth2Client {
  return new OAuth2Client(
    configuredValue("GOOGLE_OAUTH_CLIENT_ID"),
    configuredValue("GOOGLE_OAUTH_CLIENT_SECRET"),
    configuredValue("GOOGLE_OAUTH_REDIRECT_URI")
  );
}

export function buildGoogleAuthorizationUrl(input: { state: string; loginHint?: string }): string {
  if (!input.state.trim()) {
    throw new GoogleIntegrationError("OAuth state is required", "invalid_state", 400);
  }
  const url = oauthClient().generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: [...GOOGLE_OAUTH_SCOPES],
    state: input.state,
    login_hint: input.loginHint,
  });
  if (!url.startsWith(GOOGLE_AUTH_URL)) {
    throw new GoogleIntegrationError("Google authorization URL was invalid", "invalid_authorization_url");
  }
  return url;
}

export function encryptGoogleTokens(
  tokens: GoogleTokenBundle,
  encodedKey?: string
): EncryptedGoogleTokens {
  const parsed = GoogleTokenBundleSchema.parse(tokens);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", connectionKey(encodedKey), iv);
  cipher.setAAD(TOKEN_AAD);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(parsed), "utf8"),
    cipher.final(),
  ]);
  return {
    tokenCiphertext: ciphertext.toString("base64"),
    tokenIv: iv.toString("base64"),
    tokenTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptGoogleTokens(
  encrypted: EncryptedGoogleTokens,
  encodedKey?: string
): GoogleTokenBundle {
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      connectionKey(encodedKey),
      Buffer.from(encrypted.tokenIv, "base64")
    );
    decipher.setAAD(TOKEN_AAD);
    decipher.setAuthTag(Buffer.from(encrypted.tokenTag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encrypted.tokenCiphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
    return GoogleTokenBundleSchema.parse(JSON.parse(plaintext));
  } catch {
    throw new GoogleIntegrationError("Google credentials could not be decrypted", "token_decryption_failed");
  }
}

export async function exchangeGoogleAuthorizationCode(
  code: string,
  existingRefreshToken?: string
): Promise<GoogleTokenBundle> {
  if (!code.trim()) throw new GoogleIntegrationError("Authorization code is required", "missing_code", 400);
  const { tokens } = await oauthClient().getToken(code);
  const refreshToken = tokens.refresh_token ?? existingRefreshToken;
  if (!tokens.access_token || !refreshToken) {
    throw new GoogleIntegrationError(
      "Google did not return offline access. Disconnect the prior grant in Google and reconnect.",
      "missing_refresh_token",
      409
    );
  }
  return GoogleTokenBundleSchema.parse({
    accessToken: tokens.access_token,
    refreshToken,
    expiresAt: tokens.expiry_date ?? null,
    tokenType: tokens.token_type ?? "Bearer",
    scopes: (tokens.scope ?? GOOGLE_OAUTH_SCOPES.join(" ")).split(/\s+/).filter(Boolean),
  });
}

export async function getGoogleIdentity(accessToken: string): Promise<GoogleIdentity> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new GoogleIntegrationError("Google account identity could not be verified", "identity_failed", 502);
  }
  return GoogleIdentitySchema.parse(await response.json());
}

export async function refreshGoogleAccessToken(tokens: GoogleTokenBundle): Promise<string> {
  const client = oauthClient();
  client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiresAt ?? undefined,
    scope: tokens.scopes.join(" "),
    token_type: tokens.tokenType,
  });
  const result = await client.getAccessToken();
  if (!result.token) {
    throw new GoogleIntegrationError("Google access could not be refreshed", "refresh_failed", 401);
  }
  return result.token;
}

export async function revokeGoogleTokens(tokens: GoogleTokenBundle): Promise<void> {
  await oauthClient().revokeToken(tokens.refreshToken || tokens.accessToken);
}

async function googleApiRequest(accessToken: string, url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = z.object({ error: z.object({ message: z.string() }) })
      .safeParse(payload);
    throw new GoogleIntegrationError(
      message.success ? message.data.error.message : "Google API request failed",
      "google_api_failed",
      response.status
    );
  }
  return payload;
}

export async function listGoogleCalendars(accessToken: string) {
  const payload = await googleApiRequest(
    accessToken,
    `${GOOGLE_CALENDAR_URL}/users/me/calendarList?maxResults=250&minAccessRole=reader`
  );
  const parsed = z.object({ items: z.array(GoogleCalendarSchema).default([]) }).parse(payload);
  return parsed.items;
}

export async function listGoogleCalendarEvents(input: {
  accessToken: string;
  calendarId?: string;
  timeMin: string;
  timeMax: string;
  maxResults?: number;
}) {
  const maxResults = Math.min(Math.max(input.maxResults ?? 50, 1), 250);
  const params = new URLSearchParams({
    timeMin: new Date(input.timeMin).toISOString(),
    timeMax: new Date(input.timeMax).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(maxResults),
  });
  const calendarId = encodeURIComponent(input.calendarId ?? "primary");
  const payload = await googleApiRequest(
    input.accessToken,
    `${GOOGLE_CALENDAR_URL}/calendars/${calendarId}/events?${params}`
  );
  return z.object({ items: z.array(GoogleCalendarEventSchema).default([]) }).parse(payload).items;
}

export async function createGoogleCalendarEvent(input: {
  accessToken: string;
  calendarId?: string;
  event: GoogleCalendarEventInput;
}) {
  const event = GoogleCalendarEventInputSchema.parse(input.event);
  const calendarId = encodeURIComponent(input.calendarId ?? "primary");
  const payload = await googleApiRequest(
    input.accessToken,
    `${GOOGLE_CALENDAR_URL}/calendars/${calendarId}/events?sendUpdates=all`,
    { method: "POST", body: JSON.stringify(event) }
  );
  return GoogleCalendarEventSchema.parse(payload);
}

function safeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function encodeGoogleEmail(input: GoogleEmailInput): string {
  const email = GoogleEmailInputSchema.parse(input);
  const headers = [
    `To: ${email.to.map(safeHeader).join(", ")}`,
    ...(email.cc?.length ? [`Cc: ${email.cc.map(safeHeader).join(", ")}`] : []),
    ...(email.bcc?.length ? [`Bcc: ${email.bcc.map(safeHeader).join(", ")}`] : []),
    ...(email.replyTo ? [`Reply-To: ${safeHeader(email.replyTo)}`] : []),
    `Subject: ${safeHeader(email.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ];
  return Buffer.from(`${headers.join("\r\n")}\r\n\r\n${email.text}`, "utf8").toString("base64url");
}

export async function sendGoogleEmail(input: {
  accessToken: string;
  email: GoogleEmailInput;
}) {
  const payload = await googleApiRequest(
    input.accessToken,
    `${GOOGLE_GMAIL_URL}/users/me/messages/send`,
    { method: "POST", body: JSON.stringify({ raw: encodeGoogleEmail(input.email) }) }
  );
  return z.object({ id: z.string().min(1), threadId: z.string().optional() }).parse(payload);
}

export async function createGoogleEmailDraft(input: {
  accessToken: string;
  email: GoogleEmailInput;
}) {
  const payload = await googleApiRequest(
    input.accessToken,
    `${GOOGLE_GMAIL_URL}/users/me/drafts`,
    {
      method: "POST",
      body: JSON.stringify({ message: { raw: encodeGoogleEmail(input.email) } }),
    }
  );
  return z.object({
    id: z.string().min(1),
    message: z.object({ id: z.string().min(1), threadId: z.string().optional() }),
  }).parse(payload);
}

export async function listGoogleInboxMessages(input: {
  accessToken: string;
  query?: string;
  maxResults?: number;
  pageToken?: string;
}) {
  const params = new URLSearchParams({
    labelIds: "INBOX",
    maxResults: String(Math.min(Math.max(input.maxResults ?? 25, 1), 100)),
    ...(input.query ? { q: input.query } : {}),
    ...(input.pageToken ? { pageToken: input.pageToken } : {}),
  });
  const payload = await googleApiRequest(
    input.accessToken,
    `${GOOGLE_GMAIL_URL}/users/me/messages?${params}`
  );
  return z.object({
    messages: z.array(z.object({ id: z.string().min(1), threadId: z.string().optional() })).default([]),
    nextPageToken: z.string().optional(),
    resultSizeEstimate: z.number().int().nonnegative().optional(),
  }).parse(payload);
}

export async function getGoogleMessageMetadata(input: {
  accessToken: string;
  messageId: string;
}) {
  const messageId = encodeURIComponent(z.string().min(1).parse(input.messageId));
  const params = new URLSearchParams({ format: "metadata" });
  for (const header of ["From", "To", "Cc", "Subject", "Date", "Message-ID"]) {
    params.append("metadataHeaders", header);
  }
  const payload = await googleApiRequest(
    input.accessToken,
    `${GOOGLE_GMAIL_URL}/users/me/messages/${messageId}?${params}`
  );
  return z.object({
    id: z.string().min(1),
    threadId: z.string().optional(),
    labelIds: z.array(z.string()).default([]),
    snippet: z.string().default(""),
    historyId: z.string().optional(),
    internalDate: z.string().optional(),
    payload: z.object({
      headers: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
    }).optional(),
  }).parse(payload);
}

export async function watchGoogleMailbox(input: {
  accessToken: string;
  topicName: string;
}) {
  const topicName = z.string().regex(/^projects\/[a-z][a-z0-9-]{4,28}[a-z0-9]\/topics\/[A-Za-z][A-Za-z0-9._~-]{2,254}$/)
    .parse(input.topicName);
  const payload = await googleApiRequest(
    input.accessToken,
    `${GOOGLE_GMAIL_URL}/users/me/watch`,
    {
      method: "POST",
      body: JSON.stringify({ topicName, labelIds: ["INBOX"], labelFilterBehavior: "INCLUDE" }),
    }
  );
  return z.object({ historyId: z.string().min(1), expiration: z.string().min(1) }).parse(payload);
}
