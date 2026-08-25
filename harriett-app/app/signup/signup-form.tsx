"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { LoaderCircle, Mail, UserRoundCheck } from "lucide-react";
import { PasswordField } from "@/components/password-field";
import { inviteSignupSchema } from "@/lib/auth/password";
import { createBrowser } from "@/lib/db/browser";

export function SignupForm({ inviteToken }: { inviteToken: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createAccount(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!inviteToken) {
      setError("Open the private setup link from your Harriett invitation.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    const input = inviteSignupSchema.safeParse({ email, password, token: inviteToken });
    if (!input.success) {
      setError(input.error.issues[0]?.message ?? "Check your account details.");
      return;
    }
    setLoading(true);
    const supabase = createBrowser();
    const { data, error: signupError } = await supabase.auth.signUp({
      email: input.data.email,
      password: input.data.password,
      options: {
        data: { invite_token: input.data.token },
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/`,
      },
    });
    if (signupError) {
      setError("This invitation is invalid, expired, or already used.");
      setLoading(false);
      return;
    }
    if (data.session) {
      window.location.replace("/");
      return;
    }
    setSent(true);
    setLoading(false);
  }

  return (
    <main className="login-shell">
      <div className="login-panel">
        <div className="login-brand">
          <span className="login-portrait"><Image src="/harriett-logo.png" alt="Harriett" width={320} height={320} priority /></span>
          <p className="brand-wordmark">Harriett<span className="text-crimson">.</span></p>
          <p>Pritchett-Moore Real Estate</p>
        </div>
        {sent ? (
          <div className="login-message"><Mail size={22} /><div><h1>Confirm your email</h1><p>Open the secure confirmation email once. After that, you will sign in with your password.</p></div></div>
        ) : <form onSubmit={createAccount} className="login-form">
          <div><p className="eyebrow">Private invitation</p><h1>Set up your account</h1></div>
          {!inviteToken && <p className="field-error" role="alert">You need a valid invitation from Harriett to create an account.</p>}
          <label htmlFor="signup-email">Office email</label>
          <input id="signup-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@pritchett-moore.com" disabled={!inviteToken} />
          <label htmlFor="signup-password">Create password</label>
          <PasswordField id="signup-password" autoComplete="new-password" minLength={12} value={password} onChange={setPassword} />
          <p className="field-help">Use at least 12 characters.</p>
          <label htmlFor="signup-confirmation">Confirm password</label>
          <PasswordField id="signup-confirmation" autoComplete="new-password" minLength={12} value={confirmation} onChange={setConfirmation} />
          <button type="submit" className="primary-button" disabled={loading || !inviteToken}>
            {loading ? <LoaderCircle size={17} className="animate-spin" /> : <UserRoundCheck size={17} />} Create account
          </button>
          {error && <p className="field-error" role="alert">{error}</p>}
          <p className="login-footer"><Link href="/login" className="text-link">Return to sign in</Link></p>
        </form>}
      </div>
    </main>
  );
}
