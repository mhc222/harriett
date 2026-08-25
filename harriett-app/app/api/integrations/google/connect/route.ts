import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";
import {
  buildGoogleAuthorizationUrl,
  GOOGLE_OAUTH_STATE_COOKIE,
  GoogleIntegrationError,
} from "@/lib/integrations/google";

export async function GET(request: NextRequest) {
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) {
    return NextResponse.redirect(new URL("/login?next=%2Fconnections", request.url));
  }

  try {
    const state = randomBytes(32).toString("base64url");
    const authorizationUrl = buildGoogleAuthorizationUrl({
      state,
      loginHint: auth.user.email,
    });
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/api/integrations/google",
    });
    return response;
  } catch (error) {
    const reason = error instanceof GoogleIntegrationError ? error.code : "connect_failed";
    return NextResponse.redirect(new URL(`/connections?google=${encodeURIComponent(reason)}`, request.url));
  }
}
