"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { PasswordField } from "@/components/password-field";
import { accountPasswordSchema } from "@/lib/auth/password";
import { createBrowser } from "@/lib/db/browser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    const validatedPassword = accountPasswordSchema.safeParse(password);
    if (!validatedPassword.success) {
      setError(validatedPassword.error.issues[0]?.message ?? "Choose a stronger password.");
      return;
    }
    setLoading(true);
    const supabase = createBrowser();
    const { error: updateError } = await supabase.auth.updateUser({ password: validatedPassword.data });
    if (updateError) {
      setError("This reset link is invalid or expired. Request a new one.");
      setLoading(false);
      return;
    }
    window.location.replace("/");
  }

  return (
    <main className="login-shell">
      <div className="login-panel">
        <div className="login-brand">
          <span className="login-portrait"><Image src="/harriett-logo.png" alt="Harriett" width={320} height={320} priority /></span>
          <p className="brand-wordmark">Harriett<span className="text-crimson">.</span></p>
          <p>Pritchett-Moore Real Estate</p>
        </div>
        <form onSubmit={updatePassword} className="login-form">
          <div><p className="eyebrow">Account recovery</p><h1>Choose a new password</h1></div>
          <label htmlFor="new-password">New password</label>
          <PasswordField id="new-password" autoComplete="new-password" minLength={12} value={password} onChange={setPassword} />
          <p className="field-help">Use at least 12 characters.</p>
          <label htmlFor="confirm-password">Confirm password</label>
          <PasswordField id="confirm-password" autoComplete="new-password" minLength={12} value={confirmation} onChange={setConfirmation} />
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? <LoaderCircle size={17} className="animate-spin" /> : <KeyRound size={17} />} Save password
          </button>
          {error && <p className="field-error" role="alert">{error}</p>}
          <p className="login-footer"><Link href="/forgot-password" className="text-link">Request another reset link</Link></p>
        </form>
      </div>
    </main>
  );
}
