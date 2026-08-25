"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { LoaderCircle, LogIn } from "lucide-react";
import { PasswordField } from "@/components/password-field";
import { createBrowser } from "@/lib/db/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createBrowser();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("That email and password did not match.");
      setLoading(false);
      return;
    }

    const nextPath = new URLSearchParams(window.location.search).get("next") ?? "/";
    window.location.replace(nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/");
  }

  return (
    <main className="login-shell">
      <div className="login-panel">
        <div className="login-brand">
          <span className="login-portrait"><Image src="/harriett-logo.png" alt="Harriett" width={320} height={320} priority /></span>
          <p className="brand-wordmark">Harriett<span className="text-crimson">.</span></p>
          <p>Pritchett-Moore Real Estate</p>
        </div>
        <form onSubmit={signIn} className="login-form">
          <div><p className="eyebrow">Welcome back</p><h1>Sign in to Harriett</h1></div>
          <label htmlFor="login-email">Email address</label>
          <input id="login-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@pritchett-moore.com" />
          <div className="login-label-row">
            <label htmlFor="login-password">Password</label>
            <Link href="/forgot-password" className="text-link">Forgot password?</Link>
          </div>
          <PasswordField id="login-password" autoComplete="current-password" value={password} onChange={setPassword} />
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? <LoaderCircle size={17} className="animate-spin" /> : <LogIn size={17} />} Sign in
          </button>
          {error && <p className="field-error" role="alert">{error}</p>}
          <p className="login-footer">Have an invitation? <Link href="/signup" className="text-link">Set up your account</Link></p>
        </form>
      </div>
    </main>
  );
}
