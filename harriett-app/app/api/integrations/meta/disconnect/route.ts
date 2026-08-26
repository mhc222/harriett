import { NextResponse } from "next/server";
import { writeAudit } from "@/lib/audit";
import { authenticatedContext } from "@/lib/auth-context";
import { loadMetaConnection, removeMetaConnection } from "@/lib/connections/meta";
import { createUserClient } from "@/lib/db/server";
import { revokeMetaAccess } from "@/lib/integrations/meta";

export async function POST(request: Request) {
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.redirect(new URL("/login?next=%2Fconnections", request.url), 303);
  const existing = await loadMetaConnection(db);
  let providerRevoked = false;
  if (existing) {
    try {
      await revokeMetaAccess(existing.tokens.userAccessToken);
      providerRevoked = true;
    } catch {
      providerRevoked = false;
    }
  }
  const connectionId = await removeMetaConnection(db);
  await writeAudit(db, {
    officeId: auth.officeId,
    actor: "user",
    actorId: auth.user.id,
    agentId: auth.agentId,
    action: "connection.meta_disconnected",
    payload: { connectionId, providerRevoked },
  });
  return NextResponse.redirect(new URL("/connections?meta=disconnected", request.url), 303);
}
