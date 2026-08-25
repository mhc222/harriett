"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { LoaderCircle, Mail } from "lucide-react";
import { createBrowser } from "@/lib/db/browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestReset(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createBrowser();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });
    if (resetError) {
      setError("Harriett could not send the reset email. Try again shortly.");
      setLoading(false);
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
          <div className="login-message"><Mail size={22} /><div><h1>Check your email</h1><p>The secure link will let you choose a new password.</p><p><Link href="/login" className="text-link">Return to sign in</Link></p></div></div>
        ) : (
          <form onSubmit={requestReset} className="login-form">
            <div><p className="eyebrow">Account recovery</p><h1>Reset your password</h1></div>
            <label htmlFor="reset-email">Office email</label>
            <input id="reset-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@pritchett-moore.com" />
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? <LoaderCircle size={17} className="animate-spin" /> : <Mail size={17} />} Send reset link
            </button>
            {error && <p className="field-error" role="alert">{error}</p>}
            <p className="login-footer"><Link href="/login" className="text-link">Return to sign in</Link></p>
          </form>
        )}
      </div>
    </main>
  );
}
