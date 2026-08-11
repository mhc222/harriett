import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuditEntry {
  officeId: string;
  actor: "harriett" | "user" | "system";
  actorId?: string;
  agentId?: string;
  dealId?: string;
  action: string;
  payload?: Record<string, unknown>;
}

// Every Harriett action writes a row. Non-optional. Throws on failure so a
// silent audit gap cannot happen; callers decide whether to catch.
export async function writeAudit(db: SupabaseClient, entry: AuditEntry): Promise<void> {
  const { error } = await db.from("audit_log").insert({
    office_id: entry.officeId,
    actor: entry.actor,
    actor_id: entry.actorId ?? null,
    agent_id: entry.agentId ?? null,
    deal_id: entry.dealId ?? null,
    action: entry.action,
    payload: entry.payload ?? null,
  });
  if (error) throw new Error(`audit write failed for ${entry.action}: ${error.message}`);
}
