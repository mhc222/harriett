import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";
import {
  buildMetaAuthorizationUrl,
  META_OAUTH_STATE_COOKIE,
  MetaIntegrationError,
} from "@/lib/integrations/meta";

export async function GET(request: NextRequest) {
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.redirect(new URL("/login?next=%2Fconnections", request.url));

  try {
    const state = randomBytes(32).toString("base64url");
    const response = NextResponse.redirect(buildMetaAuthorizationUrl({ state }));
    response.cookies.set(META_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/api/integrations/meta",
    });
    return response;
  } catch (error) {
    const reason = error instanceof MetaIntegrationError ? error.code : "connect_failed";
    return NextResponse.redirect(new URL(`/connections?meta=${encodeURIComponent(reason)}`, request.url));
  }
}
