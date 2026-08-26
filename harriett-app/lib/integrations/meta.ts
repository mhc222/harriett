import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { z } from "zod";

const META_OAUTH_BASE = "https://www.facebook.com";
const META_GRAPH_BASE = "https://graph.facebook.com";
const TOKEN_AAD = Buffer.from("harriett:meta:v1", "utf8");

export const META_OAUTH_STATE_COOKIE = "harriett_meta_oauth_state";
export const META_OAUTH_SCOPES = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
] as const;

export const MetaPageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  accessToken: z.string().min(1),
  tasks: z.array(z.string()).default([]),
  pictureUrl: z.string().url().nullable().default(null),
});

export const MetaTokenBundleSchema = z.object({
  userAccessToken: z.string().min(1),
  userExpiresAt: z.number().int().positive().nullable(),
  scopes: z.array(z.string().min(1)),
  pages: z.array(MetaPageSchema).min(1),
});

export type MetaTokenBundle = z.infer<typeof MetaTokenBundleSchema>;
export type MetaPage = z.infer<typeof MetaPageSchema>;

export const MetaIdentitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export type MetaIdentity = z.infer<typeof MetaIdentitySchema>;

export class MetaIntegrationError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 500,
  ) {
    super(message);
    this.name = "MetaIntegrationError";
  }
}

function configuredValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new MetaIntegrationError(`${name} is not configured`, "not_configured", 503);
  return value;
}

export function metaGraphVersion(): string {
  const version = process.env.META_GRAPH_API_VERSION?.trim() || "v25.0";
  if (!/^v\d+\.\d+$/.test(version)) {
    throw new MetaIntegrationError("META_GRAPH_API_VERSION is invalid", "invalid_graph_version");
  }
  return version;
}

export function metaIntegrationConfigured(): boolean {
  return Boolean(
    process.env.META_APP_ID?.trim()
    && process.env.META_APP_SECRET?.trim()
    && process.env.META_LOGIN_CONFIG_ID?.trim()
    && process.env.META_OAUTH_REDIRECT_URI?.trim()
    && process.env.CONNECTION_ENCRYPTION_KEY?.trim()
  );
}

function connectionKey(encodedKey = configuredValue("CONNECTION_ENCRYPTION_KEY")): Buffer {
  const key = /^[a-f0-9]{64}$/i.test(encodedKey)
    ? Buffer.from(encodedKey, "hex")
    : Buffer.from(encodedKey, "base64");
  if (key.length !== 32) {
    throw new MetaIntegrationError(
      "CONNECTION_ENCRYPTION_KEY must decode to exactly 32 bytes",
      "invalid_encryption_key",
    );
  }
  return key;
}

export function buildMetaAuthorizationUrl(input: { state: string }): string {
  if (!input.state.trim()) throw new MetaIntegrationError("OAuth state is required", "invalid_state", 400);
  const url = new URL(`/${metaGraphVersion()}/dialog/oauth`, META_OAUTH_BASE);
  url.search = new URLSearchParams({
    client_id: configuredValue("META_APP_ID"),
    config_id: configuredValue("META_LOGIN_CONFIG_ID"),
    redirect_uri: configuredValue("META_OAUTH_REDIRECT_URI"),
    state: input.state,
    response_type: "code",
    override_default_response_type: "true",
  }).toString();
  return url.toString();
}

export function encryptMetaTokens(tokens: MetaTokenBundle, encodedKey?: string) {
  const parsed = MetaTokenBundleSchema.parse(tokens);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", connectionKey(encodedKey), iv);
  cipher.setAAD(TOKEN_AAD);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(parsed), "utf8"), cipher.final()]);
  return {
    tokenCiphertext: ciphertext.toString("base64"),
    tokenIv: iv.toString("base64"),
    tokenTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptMetaTokens(
  encrypted: { tokenCiphertext: string; tokenIv: string; tokenTag: string },
  encodedKey?: string,
): MetaTokenBundle {
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      connectionKey(encodedKey),
      Buffer.from(encrypted.tokenIv, "base64"),
    );
    decipher.setAAD(TOKEN_AAD);
    decipher.setAuthTag(Buffer.from(encrypted.tokenTag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encrypted.tokenCiphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
    return MetaTokenBundleSchema.parse(JSON.parse(plaintext));
  } catch {
    throw new MetaIntegrationError("Meta credentials could not be decrypted", "token_decryption_failed");
  }
}

function appSecretProof(accessToken: string): string {
  return createHmac("sha256", configuredValue("META_APP_SECRET")).update(accessToken).digest("hex");
}

async function metaRequest(
  pathname: string,
  accessToken: string,
  init?: RequestInit,
  query?: Record<string, string>,
): Promise<unknown> {
  const url = new URL(`/${metaGraphVersion()}${pathname}`, META_GRAPH_BASE);
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);
  url.searchParams.set("appsecret_proof", appSecretProof(accessToken));
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = z.object({ error: z.object({ message: z.string(), code: z.number().optional() }) }).safeParse(payload);
    throw new MetaIntegrationError(
      parsed.success ? parsed.data.error.message : "Meta Graph API request failed",
      parsed.success && parsed.data.error.code === 190 ? "token_expired" : "meta_api_failed",
      response.status,
    );
  }
  return payload;
}

async function exchangeToken(url: URL) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new MetaIntegrationError("Meta authorization code could not be exchanged", "token_exchange_failed", response.status);
  }
  return z.object({ access_token: z.string().min(1), expires_in: z.number().int().positive().optional() }).parse(payload);
}

export async function exchangeMetaAuthorizationCode(code: string): Promise<{
  accessToken: string;
  expiresAt: number | null;
}> {
  if (!code.trim()) throw new MetaIntegrationError("Authorization code is required", "missing_code", 400);
  const shortUrl = new URL(`/${metaGraphVersion()}/oauth/access_token`, META_GRAPH_BASE);
  shortUrl.search = new URLSearchParams({
    client_id: configuredValue("META_APP_ID"),
    client_secret: configuredValue("META_APP_SECRET"),
    redirect_uri: configuredValue("META_OAUTH_REDIRECT_URI"),
    code,
  }).toString();
  const short = await exchangeToken(shortUrl);

  const longUrl = new URL(`/${metaGraphVersion()}/oauth/access_token`, META_GRAPH_BASE);
  longUrl.search = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: configuredValue("META_APP_ID"),
    client_secret: configuredValue("META_APP_SECRET"),
    fb_exchange_token: short.access_token,
  }).toString();
  const long = await exchangeToken(longUrl);
  return {
    accessToken: long.access_token,
    expiresAt: long.expires_in ? Date.now() + long.expires_in * 1000 : null,
  };
}

export async function getMetaIdentity(accessToken: string): Promise<MetaIdentity> {
  return MetaIdentitySchema.parse(await metaRequest("/me", accessToken, undefined, { fields: "id,name" }));
}

export async function listManagedFacebookPages(accessToken: string): Promise<MetaPage[]> {
  const payload = await metaRequest("/me/accounts", accessToken, undefined, {
    fields: "id,name,access_token,tasks,picture{url}",
    limit: "100",
  });
  const parsed = z.object({
    data: z.array(z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      access_token: z.string().min(1),
      tasks: z.array(z.string()).default([]),
      picture: z.object({ data: z.object({ url: z.string().url() }) }).optional(),
    })).default([]),
  }).parse(payload);
  return parsed.data
    .filter((page) => page.tasks.length === 0 || page.tasks.some((task) => [
      "CREATE_CONTENT",
      "FULL_CONTROL",
      "MANAGE",
      "PROFILE_PLUS_CREATE_CONTENT",
      "PROFILE_PLUS_FULL_CONTROL",
      "PROFILE_PLUS_MANAGE",
    ].includes(task)))
    .map((page) => MetaPageSchema.parse({
      id: page.id,
      name: page.name,
      accessToken: page.access_token,
      tasks: page.tasks,
      pictureUrl: page.picture?.data.url ?? null,
    }));
}

export async function publishFacebookPagePost(input: {
  page: MetaPage;
  message: string;
  link?: string;
  imageUrl?: string;
}): Promise<{
  postId: string;
  permalinkUrl: string | null;
  verificationStatus: "graph_confirmed" | "not_visible" | "unverified";
}> {
  const message = z.string().trim().min(1).max(63_206).parse(input.message);
  const link = input.link ? z.string().url().parse(input.link) : undefined;
  const imageUrl = input.imageUrl ? z.string().url().parse(input.imageUrl) : undefined;
  if (link && imageUrl) throw new MetaIntegrationError("Facebook posts cannot attach both a link and a photo", "invalid_media", 400);
  const body = new URLSearchParams(imageUrl
    ? { caption: message, url: imageUrl, published: "true" }
    : { message });
  body.set("published", "true");
  if (link && !imageUrl) body.set("link", link);
  const created = z.object({
    id: z.string().min(1),
    post_id: z.string().min(1).optional(),
  }).parse(await metaRequest(
    `/${encodeURIComponent(input.page.id)}/${imageUrl ? "photos" : "feed"}`,
    input.page.accessToken,
    { method: "POST", body },
  ));
  const postId = created.post_id ?? created.id;
  let permalinkUrl: string | null = null;
  let verificationStatus: "graph_confirmed" | "not_visible" | "unverified" = "unverified";
  try {
    const details = z.object({
      id: z.string().min(1),
      permalink_url: z.string().url().optional(),
      is_published: z.boolean(),
      is_hidden: z.boolean(),
    }).safeParse(await metaRequest(
      `/${encodeURIComponent(postId)}`,
      input.page.accessToken,
      undefined,
      { fields: "id,permalink_url,is_published,is_hidden" },
    ));
    permalinkUrl = details.success ? details.data.permalink_url ?? null : null;
    verificationStatus = details.success
      ? details.data.is_published && !details.data.is_hidden
        ? "graph_confirmed"
        : "not_visible"
      : "unverified";
  } catch {
    // The post already exists at this point. A missing permalink must not cause a retry.
  }
  return { postId, permalinkUrl, verificationStatus };
}

export async function deleteFacebookPagePost(input: {
  page: MetaPage;
  postId: string;
}): Promise<void> {
  const postId = z.string().trim().min(1).max(300).parse(input.postId);
  const deleted = z.object({ success: z.boolean() }).parse(await metaRequest(
    `/${encodeURIComponent(postId)}`,
    input.page.accessToken,
    { method: "DELETE" },
  ));
  if (!deleted.success) {
    throw new MetaIntegrationError("Meta did not confirm that the Facebook post was deleted", "delete_not_confirmed", 502);
  }
}

export async function revokeMetaAccess(accessToken: string): Promise<void> {
  await metaRequest("/me/permissions", accessToken, { method: "DELETE" });
}
