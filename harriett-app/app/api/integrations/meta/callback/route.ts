import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { authenticatedContext } from "@/lib/auth-context";
import { saveMetaConnection } from "@/lib/connections/meta";
import { createUserClient } from "@/lib/db/server";
import {
  exchangeMetaAuthorizationCode,
  getMetaIdentity,
  listManagedFacebookPages,
  META_OAUTH_SCOPES,
  META_OAUTH_STATE_COOKIE,
  MetaIntegrationError,
} from "@/lib/integrations/meta";

const CallbackSchema = z.object({ code: z.string().min(1), state: z.string().min(1) });

function redirect(request: NextRequest, status: string) {
  const response = NextResponse.redirect(new URL(`/connections?meta=${encodeURIComponent(status)}`, request.url));
  response.cookies.set(META_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/api/integrations/meta",
  });
  return response;
}

export async function GET(request: NextRequest) {
  const expectedState = request.cookies.get(META_OAUTH_STATE_COOKIE)?.value;
  const suppliedState = request.nextUrl.searchParams.get("state");
  if (!expectedState || !suppliedState || expectedState !== suppliedState) return redirect(request, "invalid_state");

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
      action: "connection.meta_denied",
      payload: { reason: providerError },
    });
    return redirect(request, "denied");
  }

  const parsed = CallbackSchema.safeParse({ code: request.nextUrl.searchParams.get("code"), state: suppliedState });
  if (!parsed.success) return redirect(request, "invalid_callback");

  try {
    const exchanged = await exchangeMetaAuthorizationCode(parsed.data.code);
    const [identity, pages] = await Promise.all([
      getMetaIdentity(exchanged.accessToken),
      listManagedFacebookPages(exchanged.accessToken),
    ]);
    if (pages.length === 0) throw new MetaIntegrationError("No publishable Facebook Pages were returned", "no_pages", 409);
    const connectionId = await saveMetaConnection({
      db,
      identity,
      tokens: {
        userAccessToken: exchanged.accessToken,
        userExpiresAt: exchanged.expiresAt,
        scopes: [...META_OAUTH_SCOPES],
        pages,
      },
    });
    await writeAudit(db, {
      officeId: auth.officeId,
      actor: "user",
      actorId: auth.user.id,
      agentId: auth.agentId,
      action: "connection.meta_connected",
      payload: {
        connectionId,
        accountId: identity.id,
        accountName: identity.name,
        pageCount: pages.length,
        autoSelectedPageId: pages.length === 1 ? pages[0].id : null,
        scopes: META_OAUTH_SCOPES,
      },
    });
    return redirect(request, pages.length === 1 ? "connected" : "choose_page");
  } catch (error) {
    const reason = error instanceof MetaIntegrationError ? error.code : "callback_failed";
    await writeAudit(db, {
      officeId: auth.officeId,
      actor: "user",
      actorId: auth.user.id,
      agentId: auth.agentId,
      action: "connection.meta_failed",
      payload: { reason },
    });
    return redirect(request, reason);
  }
}
