import { NextRequest, NextResponse } from "next/server";
import { writeAudit } from "@/lib/audit";
import { authenticatedContext } from "@/lib/auth-context";
import {
  loadGoogleConnectionTokens,
  removeGoogleConnection,
} from "@/lib/connections/google";
import { createUserClient } from "@/lib/db/server";
import { revokeGoogleTokens } from "@/lib/integrations/google";

export async function POST(request: NextRequest) {
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) {
    return NextResponse.redirect(new URL("/login?next=%2Fconnections", request.url), 303);
  }

  const existing = await loadGoogleConnectionTokens(db);
  let remoteRevoked = false;
  if (existing) {
    try {
      await revokeGoogleTokens(existing.tokens);
      remoteRevoked = true;
    } catch {
      remoteRevoked = false;
    }
  }
  const connectionId = await removeGoogleConnection(db);
  await writeAudit(db, {
    officeId: auth.officeId,
    actor: "user",
    actorId: auth.user.id,
    agentId: auth.agentId,
    action: "connection.google_disconnected",
    payload: { connectionId, remoteRevoked },
  });
  return NextResponse.redirect(new URL("/connections?google=disconnected", request.url), 303);
}
