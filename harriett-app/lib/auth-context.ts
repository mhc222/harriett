import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface AuthenticatedContext {
  user: User;
  officeId: string;
  agentId: string;
  role: "broker" | "agent" | "coordinator";
}

export async function authenticatedContext(
  db: SupabaseClient
): Promise<AuthenticatedContext | null> {
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;

  const metadata = user.app_metadata as {
    office_id?: string;
    agent_id?: string;
    role?: string;
  };
  if (!metadata.office_id || !metadata.agent_id) return null;
  if (!metadata.role || !["broker", "agent", "coordinator"].includes(metadata.role)) return null;

  return {
    user,
    officeId: metadata.office_id,
    agentId: metadata.agent_id,
    role: metadata.role as AuthenticatedContext["role"],
  };
}
