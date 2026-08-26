import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  decryptMetaTokens,
  encryptMetaTokens,
  MetaTokenBundleSchema,
  type MetaIdentity,
  type MetaTokenBundle,
} from "@/lib/integrations/meta";

const MetaSecretRowSchema = z.object({
  connection_id: z.string().uuid(),
  token_ciphertext: z.string().min(1),
  token_iv: z.string().min(1),
  token_tag: z.string().min(1),
  expires_at: z.string().nullable(),
  capabilities: z.record(z.string(), z.unknown()).default({}),
});

export async function saveMetaConnection(input: {
  db: SupabaseClient;
  identity: MetaIdentity;
  tokens: MetaTokenBundle;
}): Promise<string> {
  const tokens = MetaTokenBundleSchema.parse(input.tokens);
  const encrypted = encryptMetaTokens(tokens);
  const selectedPageId = tokens.pages.length === 1 ? tokens.pages[0].id : null;
  const capabilities = {
    account_name: input.identity.name,
    facebook_publish: true,
    instagram_publish: false,
    selected_page_id: selectedPageId,
    pages: tokens.pages.map((page) => ({
      id: page.id,
      name: page.name,
      tasks: page.tasks,
      picture_url: page.pictureUrl,
    })),
  };
  const { data, error } = await input.db.rpc("upsert_meta_connection", {
    p_external_user_id: input.identity.id,
    p_scopes: tokens.scopes,
    p_capabilities: capabilities,
    p_token_ciphertext: encrypted.tokenCiphertext,
    p_token_iv: encrypted.tokenIv,
    p_token_tag: encrypted.tokenTag,
    p_expires_at: tokens.userExpiresAt ? new Date(tokens.userExpiresAt).toISOString() : null,
  });
  if (error || typeof data !== "string") {
    throw new Error(`Facebook connection could not be saved: ${error?.message ?? "missing connection id"}`);
  }
  return z.string().uuid().parse(data);
}

export async function loadMetaConnection(db: SupabaseClient): Promise<{
  connectionId: string;
  tokens: MetaTokenBundle;
  selectedPageId: string | null;
} | null> {
  const { data, error } = await db.rpc("get_meta_connection_secret");
  if (error) throw new Error(`Facebook credentials could not be loaded: ${error.message}`);
  const parsed = z.array(MetaSecretRowSchema).safeParse(data);
  if (!parsed.success || !parsed.data[0]) return null;
  const row = parsed.data[0];
  return {
    connectionId: row.connection_id,
    tokens: decryptMetaTokens({
      tokenCiphertext: row.token_ciphertext,
      tokenIv: row.token_iv,
      tokenTag: row.token_tag,
    }),
    selectedPageId: typeof row.capabilities.selected_page_id === "string"
      ? row.capabilities.selected_page_id
      : null,
  };
}

export async function selectMetaPage(db: SupabaseClient, pageId: string): Promise<string> {
  const { data, error } = await db.rpc("select_meta_page", { p_page_id: z.string().min(1).parse(pageId) });
  if (error || typeof data !== "string") throw new Error(error?.message ?? "Facebook Page could not be selected");
  return z.string().uuid().parse(data);
}

export async function removeMetaConnection(db: SupabaseClient): Promise<string | null> {
  const { data, error } = await db.rpc("disconnect_meta_connection");
  if (error) throw new Error(`Facebook connection could not be removed: ${error.message}`);
  return data == null ? null : z.string().uuid().parse(data);
}
