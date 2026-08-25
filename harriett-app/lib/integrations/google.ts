import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_CALENDAR_URL = "https://www.googleapis.com/calendar/v3";
const GOOGLE_GMAIL_URL = "https://gmail.googleapis.com/gmail/v1";
const GOOGLE_PEOPLE_URL = "https://people.googleapis.com/v1";
const TOKEN_AAD = Buffer.from("harriett:google:v1", "utf8");

export const GOOGLE_OAUTH_STATE_COOKIE = "harriett_google_oauth_state";

export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/contacts",
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
  updated: z.string().optional(),
  organizer: z.object({ email: z.string().email().optional() }).optional(),
  attendees: z.array(z.object({ email: z.string().email().optional() })).default([]),
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

const GoogleCalendarDateTimeSchema = z.object({
  date: z.string().date().optional(),
  dateTime: z.string().datetime({ offset: true }).optional(),
  timeZone: z.string().min(1).optional(),
}).refine((value) => Boolean(value.date) !== Boolean(value.dateTime), "provide either date or dateTime");

export const GoogleCalendarEventPatchSchema = z.object({
  summary: z.string().trim().min(1).max(500).optional(),
  description: z.string().max(10_000).nullable().optional(),
  location: z.string().max(1_000).nullable().optional(),
  start: GoogleCalendarDateTimeSchema.optional(),
  end: GoogleCalendarDateTimeSchema.optional(),
  attendees: z.array(z.object({ email: z.string().email() })).max(100).optional(),
}).refine((value) => Object.keys(value).length > 0, "provide at least one calendar change");

export type GoogleCalendarEventPatch = z.infer<typeof GoogleCalendarEventPatchSchema>;

export const GoogleEmailInputSchema = z.object({
  to: z.array(z.string().email()).min(1).max(50),
  cc: z.array(z.string().email()).max(50).optional(),
  bcc: z.array(z.string().email()).max(50).optional(),
  subject: z.string().trim().min(1).max(998),
  text: z.string().min(1).max(500_000),
  replyTo: z.string().email().optional(),
  threadId: z.string().min(1).max(200).optional(),
  inReplyTo: z.string().trim().min(1).max(998).optional(),
  references: z.string().trim().min(1).max(5_000).optional(),
});

export type GoogleEmailInput = z.infer<typeof GoogleEmailInputSchema>;

export const GoogleContactInputSchema = z.object({
  givenName: z.string().trim().min(1).max(200),
  familyName: z.string().trim().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().min(3).max(100).optional(),
  company: z.string().trim().max(300).optional(),
  jobTitle: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(5_000).optional(),
});

export const GoogleContactPatchSchema = GoogleContactInputSchema.partial()
  .refine((value) => Object.keys(value).length > 0, "provide at least one contact change");

export type GoogleContactInput = z.infer<typeof GoogleContactInputSchema>;
export type GoogleContactPatch = z.infer<typeof GoogleContactPatchSchema>;

const GooglePersonSchema = z.object({
  resourceName: z.string().regex(/^people\//),
  etag: z.string().optional(),
  metadata: z.object({ sources: z.array(z.object({ etag: z.string().optional() }).passthrough()).default([]) }).passthrough().optional(),
  names: z.array(z.object({ displayName: z.string().optional(), givenName: z.string().optional(), familyName: z.string().optional() })).default([]),
  emailAddresses: z.array(z.object({ value: z.string().email().optional(), type: z.string().optional() })).default([]),
  phoneNumbers: z.array(z.object({ value: z.string().optional(), type: z.string().optional() })).default([]),
  organizations: z.array(z.object({ name: z.string().optional(), title: z.string().optional() })).default([]),
  biographies: z.array(z.object({ value: z.string().optional() })).default([]),
});

export type GooglePerson = z.infer<typeof GooglePersonSchema>;

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

export function googleMonitoringConfigured(): boolean {
  return googleIntegrationConfigured() && Boolean(
    process.env.GOOGLE_GMAIL_PUBSUB_TOPIC?.trim()
    && process.env.GOOGLE_PUBSUB_AUDIENCE?.trim()
    && process.env.GOOGLE_PUBSUB_SERVICE_ACCOUNT?.trim()
    && process.env.NEXT_PUBLIC_APP_URL?.trim()
  );
}

export async function verifyGooglePubSubAuthorization(
  authorizationHeader: string | null
): Promise<void> {
  const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new GoogleIntegrationError("Pub/Sub authorization is missing", "pubsub_unauthorized", 401);
  }
  const audience = configuredValue("GOOGLE_PUBSUB_AUDIENCE");
  const expectedEmail = configuredValue("GOOGLE_PUBSUB_SERVICE_ACCOUNT").toLowerCase();
  try {
    const ticket = await new OAuth2Client().verifyIdToken({ idToken: match[1], audience });
    const payload = ticket.getPayload();
    if (!payload?.email_verified || payload.email?.toLowerCase() !== expectedEmail) {
      throw new Error("unexpected service account");
    }
  } catch {
    throw new GoogleIntegrationError("Pub/Sub authorization is invalid", "pubsub_unauthorized", 401);
  }
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

export async function listGoogleCalendarEventChanges(input: {
  accessToken: string;
  calendarId?: string;
  syncToken?: string;
  pageToken?: string;
}) {
  const params = new URLSearchParams({
    maxResults: "2500",
    showDeleted: "true",
    singleEvents: "true",
    ...(input.syncToken ? { syncToken: input.syncToken } : {}),
    ...(input.pageToken ? { pageToken: input.pageToken } : {}),
  });
  if (!input.syncToken) {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    params.set("timeMin", start.toISOString());
  }
  const calendarId = encodeURIComponent(input.calendarId ?? "primary");
  const payload = await googleApiRequest(
    input.accessToken,
    `${GOOGLE_CALENDAR_URL}/calendars/${calendarId}/events?${params}`
  );
  return z.object({
    items: z.array(GoogleCalendarEventSchema).default([]),
    nextPageToken: z.string().optional(),
    nextSyncToken: z.string().optional(),
  }).parse(payload);
}

export async function watchGoogleCalendar(input: {
  accessToken: string;
  calendarId?: string;
  channelId: string;
  webhookUrl: string;
  verificationToken: string;
  expiration: number;
}) {
  const calendarId = encodeURIComponent(input.calendarId ?? "primary");
  const body = z.object({
    id: z.string().uuid(),
    address: z.string().url().startsWith("https://"),
    token: z.string().min(32).max(256),
    expiration: z.number().int().positive(),
  }).parse({
    id: input.channelId,
    address: input.webhookUrl,
    token: input.verificationToken,
    expiration: input.expiration,
  });
  const payload = await googleApiRequest(
    input.accessToken,
    `${GOOGLE_CALENDAR_URL}/calendars/${calendarId}/events/watch`,
    {
      method: "POST",
      body: JSON.stringify({ ...body, type: "web_hook" }),
    }
  );
  return z.object({
    id: z.string().min(1),
    resourceId: z.string().min(1),
    resourceUri: z.string().optional(),
    expiration: z.string().optional(),
  }).parse(payload);
}

export async function stopGoogleCalendarChannel(input: {
  accessToken: string;
  channelId: string;
  resourceId: string;
}) {
  await googleApiRequest(
    input.accessToken,
    `${GOOGLE_CALENDAR_URL}/channels/stop`,
    {
      method: "POST",
      body: JSON.stringify({
        id: z.string().min(1).parse(input.channelId),
        resourceId: z.string().min(1).parse(input.resourceId),
      }),
    }
  );
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

export async function updateGoogleCalendarEvent(input: {
  accessToken: string;
  calendarId?: string;
  eventId: string;
  patch: GoogleCalendarEventPatch;
}) {
  const patch = GoogleCalendarEventPatchSchema.parse(input.patch);
  const calendarId = encodeURIComponent(input.calendarId ?? "primary");
  const eventId = encodeURIComponent(z.string().min(1).max(1_024).parse(input.eventId));
  const payload = await googleApiRequest(
    input.accessToken,
    `${GOOGLE_CALENDAR_URL}/calendars/${calendarId}/events/${eventId}?sendUpdates=all`,
    { method: "PATCH", body: JSON.stringify(patch) }
  );
  return GoogleCalendarEventSchema.parse(payload);
}

export async function deleteGoogleCalendarEvent(input: {
  accessToken: string;
  calendarId?: string;
  eventId: string;
}) {
  const calendarId = encodeURIComponent(input.calendarId ?? "primary");
  const eventId = encodeURIComponent(z.string().min(1).max(1_024).parse(input.eventId));
  await googleApiRequest(
    input.accessToken,
    `${GOOGLE_CALENDAR_URL}/calendars/${calendarId}/events/${eventId}?sendUpdates=all`,
    { method: "DELETE" }
  );
  return { eventId: input.eventId, deleted: true as const };
}

export async function queryGoogleFreeBusy(input: {
  accessToken: string;
  timeMin: string;
  timeMax: string;
  calendarIds?: string[];
  timeZone?: string;
}) {
  const timeMin = new Date(z.string().datetime({ offset: true }).parse(input.timeMin)).toISOString();
  const timeMax = new Date(z.string().datetime({ offset: true }).parse(input.timeMax)).toISOString();
  if (Date.parse(timeMax) <= Date.parse(timeMin)) throw new Error("free-time window must end after it starts");
  const calendarIds = z.array(z.string().min(1)).min(1).max(50).parse(input.calendarIds ?? ["primary"]);
  const payload = await googleApiRequest(
    input.accessToken,
    `${GOOGLE_CALENDAR_URL}/freeBusy`,
    {
      method: "POST",
      body: JSON.stringify({
        timeMin,
        timeMax,
        ...(input.timeZone ? { timeZone: input.timeZone } : {}),
        items: calendarIds.map((id) => ({ id })),
      }),
    }
  );
  return z.object({
    calendars: z.record(z.string(), z.object({
      busy: z.array(z.object({ start: z.string().datetime({ offset: true }), end: z.string().datetime({ offset: true }) })).default([]),
      errors: z.array(z.object({ reason: z.string().optional() }).passthrough()).default([]),
    })).default({}),
  }).parse(payload);
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
    ...(email.inReplyTo ? [`In-Reply-To: ${safeHeader(email.inReplyTo)}`] : []),
    ...(email.references ? [`References: ${safeHeader(email.references)}`] : []),
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
    {
      method: "POST",
      body: JSON.stringify({
        raw: encodeGoogleEmail(input.email),
        ...(input.email.threadId ? { threadId: input.email.threadId } : {}),
      }),
    }
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
      body: JSON.stringify({
        message: {
          raw: encodeGoogleEmail(input.email),
          ...(input.email.threadId ? { threadId: input.email.threadId } : {}),
        },
      }),
    }
  );
  return z.object({
    id: z.string().min(1),
    message: z.object({ id: z.string().min(1), threadId: z.string().optional() }),
  }).parse(payload);
}

function googlePersonBody(input: GoogleContactInput | GoogleContactPatch) {
  return {
    ...(input.givenName !== undefined || input.familyName !== undefined ? {
      names: [{ givenName: input.givenName ?? "", familyName: input.familyName ?? "" }],
    } : {}),
    ...(input.email !== undefined ? { emailAddresses: input.email ? [{ value: input.email }] : [] } : {}),
    ...(input.phone !== undefined ? { phoneNumbers: input.phone ? [{ value: input.phone }] : [] } : {}),
    ...(input.company !== undefined || input.jobTitle !== undefined ? {
      organizations: [{ name: input.company ?? "", title: input.jobTitle ?? "" }],
    } : {}),
    ...(input.notes !== undefined ? { biographies: input.notes ? [{ value: input.notes }] : [] } : {}),
  };
}

const GOOGLE_PERSON_FIELDS = "names,emailAddresses,phoneNumbers,organizations,biographies,metadata";

export async function searchGoogleContacts(input: {
  accessToken: string;
  query: string;
  limit?: number;
}) {
  const query = z.string().trim().min(1).max(200).parse(input.query);
  const pageSize = Math.min(Math.max(input.limit ?? 10, 1), 30);
  const params = new URLSearchParams({
    query,
    readMask: GOOGLE_PERSON_FIELDS,
    pageSize: String(pageSize),
  });
  const payload = await googleApiRequest(
    input.accessToken,
    `${GOOGLE_PEOPLE_URL}/people:searchContacts?${params}`
  );
  return z.object({ results: z.array(z.object({ person: GooglePersonSchema })).default([]) })
    .parse(payload).results.map((result) => result.person);
}

export async function getGoogleContact(input: { accessToken: string; resourceName: string }) {
  const resourceName = z.string().regex(/^people\/[A-Za-z0-9_-]+$/).parse(input.resourceName);
  const params = new URLSearchParams({ personFields: GOOGLE_PERSON_FIELDS });
  const payload = await googleApiRequest(
    input.accessToken,
    `${GOOGLE_PEOPLE_URL}/${resourceName}?${params}`
  );
  return GooglePersonSchema.parse(payload);
}

export async function createGoogleContact(input: {
  accessToken: string;
  contact: GoogleContactInput;
}) {
  const contact = GoogleContactInputSchema.parse(input.contact);
  const params = new URLSearchParams({ personFields: GOOGLE_PERSON_FIELDS });
  const payload = await googleApiRequest(
    input.accessToken,
    `${GOOGLE_PEOPLE_URL}/people:createContact?${params}`,
    { method: "POST", body: JSON.stringify(googlePersonBody(contact)) }
  );
  return GooglePersonSchema.parse(payload);
}

export async function updateGoogleContact(input: {
  accessToken: string;
  resourceName: string;
  patch: GoogleContactPatch;
}) {
  const patch = GoogleContactPatchSchema.parse(input.patch);
  const existing = await getGoogleContact({ accessToken: input.accessToken, resourceName: input.resourceName });
  const personBody = googlePersonBody(patch);
  const updatePersonFields = Object.keys(personBody).join(",");
  const params = new URLSearchParams({ updatePersonFields, personFields: GOOGLE_PERSON_FIELDS });
  const payload = await googleApiRequest(
    input.accessToken,
    `${GOOGLE_PEOPLE_URL}/${existing.resourceName}:updateContact?${params}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        resourceName: existing.resourceName,
        etag: existing.etag,
        metadata: existing.metadata,
        ...personBody,
      }),
    }
  );
  return GooglePersonSchema.parse(payload);
}

export async function deleteGoogleContact(input: {
  accessToken: string;
  resourceName: string;
}) {
  const resourceName = z.string().regex(/^people\/[A-Za-z0-9_-]+$/).parse(input.resourceName);
  await googleApiRequest(
    input.accessToken,
    `${GOOGLE_PEOPLE_URL}/${resourceName}:deleteContact`,
    { method: "DELETE" }
  );
  return { resourceName, deleted: true as const };
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

const GmailPartSchema: z.ZodType<{
  mimeType?: string;
  filename?: string;
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: Array<z.infer<typeof GmailPartSchema>>;
}> = z.lazy(() => z.object({
  mimeType: z.string().optional(),
  filename: z.string().optional(),
  body: z.object({
    data: z.string().optional(),
    attachmentId: z.string().optional(),
    size: z.number().optional(),
  }).optional(),
  parts: z.array(GmailPartSchema).optional(),
}));

function gmailTextParts(part: z.infer<typeof GmailPartSchema>, output: string[]): void {
  if (part.mimeType === "text/plain" && part.body?.data) {
    output.push(Buffer.from(part.body.data, "base64url").toString("utf8"));
  }
  for (const child of part.parts ?? []) gmailTextParts(child, output);
}

export async function getGoogleMessageContent(input: {
  accessToken: string;
  messageId: string;
}) {
  const messageId = encodeURIComponent(z.string().min(1).parse(input.messageId));
  const payload = await googleApiRequest(
    input.accessToken,
    `${GOOGLE_GMAIL_URL}/users/me/messages/${messageId}?format=full`
  );
  const parsed = z.object({
    id: z.string().min(1),
    threadId: z.string().optional(),
    labelIds: z.array(z.string()).default([]),
    snippet: z.string().default(""),
    internalDate: z.string().optional(),
    payload: GmailPartSchema.and(z.object({
      headers: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
    })),
  }).parse(payload);
  const textParts: string[] = [];
  gmailTextParts(parsed.payload, textParts);
  return {
    id: parsed.id,
    threadId: parsed.threadId,
    labelIds: parsed.labelIds,
    snippet: parsed.snippet,
    internalDate: parsed.internalDate,
    headers: parsed.payload.headers,
    text: textParts.join("\n\n").trim().slice(0, 50_000),
  };
}

export async function listGoogleMailboxHistory(input: {
  accessToken: string;
  startHistoryId: string;
  pageToken?: string;
}) {
  const params = new URLSearchParams({
    startHistoryId: z.string().regex(/^\d+$/).parse(input.startHistoryId),
    historyTypes: "messageAdded",
    labelId: "INBOX",
    maxResults: "500",
    ...(input.pageToken ? { pageToken: input.pageToken } : {}),
  });
  const payload = await googleApiRequest(
    input.accessToken,
    `${GOOGLE_GMAIL_URL}/users/me/history?${params}`
  );
  const messageRef = z.object({ id: z.string().min(1), threadId: z.string().optional() });
  return z.object({
    history: z.array(z.object({
      id: z.string().min(1),
      messagesAdded: z.array(z.object({ message: messageRef })).default([]),
    })).default([]),
    historyId: z.string().min(1),
    nextPageToken: z.string().optional(),
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
