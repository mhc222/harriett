import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  decryptGoogleTokens,
  encryptGoogleTokens,
  refreshGoogleAccessToken,
  type GoogleIdentity,
  type GoogleTokenBundle,
} from "@/lib/integrations/google";

const GoogleSecretRowSchema = z.object({
  connection_id: z.string().uuid(),
  token_ciphertext: z.string().min(1),
  token_iv: z.string().min(1),
  token_tag: z.string().min(1),
  expires_at: z.string().nullable(),
});

export async function loadGoogleConnectionTokens(
  db: SupabaseClient
): Promise<{ connectionId: string; tokens: GoogleTokenBundle } | null> {
  const { data, error } = await db.rpc("get_google_connection_secret");
  if (error) throw new Error(`Google credentials could not be loaded: ${error.message}`);
  const parsed = z.array(GoogleSecretRowSchema).safeParse(data);
  if (!parsed.success || !parsed.data[0]) return null;
  const row = parsed.data[0];
  return {
    connectionId: row.connection_id,
    tokens: decryptGoogleTokens({
      tokenCiphertext: row.token_ciphertext,
      tokenIv: row.token_iv,
      tokenTag: row.token_tag,
    }),
  };
}

export async function saveGoogleConnection(input: {
  db: SupabaseClient;
  identity: GoogleIdentity;
  tokens: GoogleTokenBundle;
}): Promise<string> {
  const encrypted = encryptGoogleTokens(input.tokens);
  const capabilities = {
    account_email: input.identity.email,
    account_name: input.identity.name ?? null,
    mail: true,
    mail_send: true,
    mail_read: true,
    mail_drafts: true,
    mail_monitor: true,
    calendar: true,
    calendar_read: true,
    calendar_write: true,
    contacts: false,
  };
  const { data, error } = await input.db.rpc("upsert_google_connection", {
    p_external_user_id: input.identity.sub,
    p_scopes: input.tokens.scopes,
    p_capabilities: capabilities,
    p_token_ciphertext: encrypted.tokenCiphertext,
    p_token_iv: encrypted.tokenIv,
    p_token_tag: encrypted.tokenTag,
    p_expires_at: input.tokens.expiresAt
      ? new Date(input.tokens.expiresAt).toISOString()
      : null,
  });
  if (error || typeof data !== "string") {
    throw new Error(`Google connection could not be saved: ${error?.message ?? "missing connection id"}`);
  }
  return z.string().uuid().parse(data);
}

export async function removeGoogleConnection(db: SupabaseClient): Promise<string | null> {
  const { data, error } = await db.rpc("disconnect_google_connection");
  if (error) throw new Error(`Google connection could not be removed: ${error.message}`);
  return data == null ? null : z.string().uuid().parse(data);
}

export async function getConnectedGoogleAccessToken(
  db: SupabaseClient
): Promise<{ connectionId: string; accessToken: string }> {
  const connection = await loadGoogleConnectionTokens(db);
  if (!connection) throw new Error("Google is not connected for this agent");
  return {
    connectionId: connection.connectionId,
    accessToken: await refreshGoogleAccessToken(connection.tokens),
  };
}
