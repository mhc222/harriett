import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { z } from "zod";
import { createUserClient } from "@/lib/db/server";

const emailOtpTypeSchema = z.enum([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]) satisfies z.ZodType<EmailOtpType>;
const authCredentialSchema = z.string().min(1).max(4096);

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = authCredentialSchema.safeParse(searchParams.get("code"));
  const tokenHash = authCredentialSchema.safeParse(searchParams.get("token_hash"));
  const type = emailOtpTypeSchema.safeParse(searchParams.get("type"));
  const nextPath = safeNextPath(searchParams.get("next"));

  const supabase = await createUserClient();

  if (code.success) {
    const { error } = await supabase.auth.exchangeCodeForSession(code.data);
    if (!error) {
      return NextResponse.redirect(new URL(nextPath, request.url));
    }
  }

  if (tokenHash.success && type.success) {
    const { error } = await supabase.auth.verifyOtp({
      type: type.data,
      token_hash: tokenHash.data,
    });
    if (!error) {
      return NextResponse.redirect(new URL(nextPath, request.url));
    }
  }
  return NextResponse.redirect(new URL("/login?error=invalid_link", request.url));
}
