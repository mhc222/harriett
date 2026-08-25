import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { authenticatedContext } from "@/lib/auth-context";
import {
  loadGoogleConnectionTokens,
  saveGoogleConnection,
} from "@/lib/connections/google";
import { createUserClient } from "@/lib/db/server";
import {
  exchangeGoogleAuthorizationCode,
  GOOGLE_OAUTH_STATE_COOKIE,
  getGoogleIdentity,
  GoogleIntegrationError,
} from "@/lib/integrations/google";

const CallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

function redirect(request: NextRequest, status: string) {
  const response = NextResponse.redirect(
    new URL(`/connections?google=${encodeURIComponent(status)}`, request.url)
  );
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/api/integrations/google",
  });
  return response;
}

export async function GET(request: NextRequest) {
  const expectedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const suppliedState = request.nextUrl.searchParams.get("state");
  if (!expectedState || !suppliedState || expectedState !== suppliedState) {
    return redirect(request, "invalid_state");
  }

  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return redirect(request, "session_expired");

  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError) {
    await writeAudit(db, {
      officeId: auth.officeId,
      actor: "user",
      actorId: auth.user.id,
      agentId: auth.agentId,
      action: "connection.google_denied",
      payload: { reason: providerError },
    });
    return redirect(request, "denied");
  }

  const parsed = CallbackSchema.safeParse({
    code: request.nextUrl.searchParams.get("code"),
    state: suppliedState,
  });
  if (!parsed.success) return redirect(request, "invalid_callback");

  try {
    const existing = await loadGoogleConnectionTokens(db);
    const tokens = await exchangeGoogleAuthorizationCode(
      parsed.data.code,
      existing?.tokens.refreshToken
    );
    const identity = await getGoogleIdentity(tokens.accessToken);
    const connectionId = await saveGoogleConnection({ db, identity, tokens });

    await writeAudit(db, {
      officeId: auth.officeId,
      actor: "user",
      actorId: auth.user.id,
      agentId: auth.agentId,
      action: "connection.google_connected",
      payload: {
        connectionId,
        accountEmail: identity.email,
        scopes: tokens.scopes,
        mailRead: true,
      },
    });
    return redirect(request, "connected");
  } catch (error) {
    const reason = error instanceof GoogleIntegrationError ? error.code : "callback_failed";
    await writeAudit(db, {
      officeId: auth.officeId,
      actor: "user",
      actorId: auth.user.id,
      agentId: auth.agentId,
      action: "connection.google_failed",
      payload: { reason },
    });
    return redirect(request, reason);
  }
}
