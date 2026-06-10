"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { DEMO_ACCOUNTS, setUser, type HarriettUser } from "../lib/auth";

const ROLE_DESCRIPTIONS = {
  broker: "Full office view, approval queue, all agents",
  agent: "Your deals, pre-listing pipeline, Harriett assistant",
  coordinator: "Photo queue, MLS tasks, file management, postcard queue",
};

const ROLE_COLORS = {
  broker: { bg: "#FEF2F2", border: "#FECACA", badge: "var(--crimson)" },
  agent: { bg: "#F0F9FF", border: "#BAE6FD", badge: "#0369A1" },
  coordinator: { bg: "#F0FDF4", border: "#BBF7D0", badge: "#166534" },
};

function AccountCard({ user, onSelect }: { user: HarriettUser; onSelect: () => void }) {
  const colors = ROLE_COLORS[user.role];
  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-5 rounded-xl border transition-all duration-150 active:scale-[0.99] group"
      style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#9C9189"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--cream-border)"; }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.badge }}
        >
          {user.initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: "var(--ink)" }}>{user.name}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-mid)" }}>{user.title}</p>
          <p
            className="text-[10px] font-semibold uppercase tracking-wide mt-1"
            style={{ color: "var(--ink-light)" }}
          >
            {user.role === "broker" ? "Broker" : user.role === "coordinator" ? "Coordinator" : "Agent"}
          </p>
        </div>
        <svg
          className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5"
          style={{ color: "var(--ink-light)" }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "agent" as HarriettUser["role"] });
  const [submitting, setSubmitting] = useState(false);

  function selectAccount(user: HarriettUser) {
    setUser(user);
    router.push("/dashboard");
  }

  function handleCreate() {
    if (!form.name.trim()) return;
    setSubmitting(true);
    const newUser: HarriettUser = {
      id: `user-${Date.now()}`,
      name: form.name.trim(),
      role: form.role,
      title: form.role === "broker" ? "Broker" : form.role === "coordinator" ? "Coordinator" : "Agent",
      initials: form.name.trim().split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
    };
    setTimeout(() => {
      setUser(newUser);
      router.push("/onboarding");
    }, 600);
  }

  return (
    <div className="min-h-[100dvh] flex">
      {/* Left panel — logo hero */}
      <div className="hidden lg:flex flex-col items-center justify-center w-[45%] flex-shrink-0 relative overflow-hidden"
        style={{ background: "var(--ink)" }}>
        <div className="absolute top-7 left-8 flex items-center gap-3">
          <Image src="/harriett-logo.png" alt="Harriett." width={36} height={36} className="rounded-lg" />
          <Link href="/" className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-playfair)", color: "#F5F0E8" }}>
            Harriett<span style={{ color: "var(--crimson)" }}>.</span>
          </Link>
        </div>
        <Image src="/harriett-logo.png" alt="Harriett." width={420} height={420}
          className="rounded-3xl" style={{ boxShadow: "0 8px 64px 0 rgba(0,0,0,0.4)" }} priority />
        <p className="mt-8 text-base font-medium text-center max-w-xs"
          style={{ color: "#9C9189", fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
          The chief of staff your agents didn't know they wanted.
        </p>
      </div>

      {/* Right panel — account picker */}
      <div className="flex-1 flex flex-col" style={{ background: "var(--cream)" }}>
        {/* Mobile nav */}
        <nav className="lg:hidden px-8 py-5 flex items-center gap-3">
          <Image src="/harriett-logo.png" alt="Harriett." width={32} height={32} className="rounded-lg" />
          <Link href="/" className="text-xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
            Harriett<span style={{ color: "var(--crimson)" }}>.</span>
          </Link>
        </nav>

        <main className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          {!showCreate ? (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight mb-1" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
                  Welcome back.
                </h1>
                <p className="text-sm" style={{ color: "var(--ink-mid)" }}>
                  Select your account to continue.
                </p>
              </div>

              <div className="space-y-3">
                {DEMO_ACCOUNTS.map((user) => (
                  <AccountCard key={user.id} user={user} onSelect={() => selectAccount(user)} />
                ))}
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowCreate(true)}
                  className="text-sm transition-colors hover:underline underline-offset-2"
                  style={{ color: "var(--ink-light)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink-mid)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-light)")}
                >
                  Create a new account
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex items-center gap-1.5 text-sm mb-4 transition-colors"
                  style={{ color: "var(--ink-light)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink-mid)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-light)")}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  Back
                </button>
                <h1 className="text-2xl font-semibold tracking-tight mb-1" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
                  Create your account.
                </h1>
                <p className="text-sm" style={{ color: "var(--ink-mid)" }}>Harriett will set up your workspace.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--ink-mid)" }}>
                    Full name
                  </label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition-colors"
                    style={{ borderColor: "var(--cream-border)", background: "var(--surface)", color: "var(--ink)", fontFamily: "var(--font-geist-sans)" }}
                    onFocus={(e) => (e.target.style.borderColor = "#9C9189")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--cream-border)")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--ink-mid)" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition-colors"
                    style={{ borderColor: "var(--cream-border)", background: "var(--surface)", color: "var(--ink)", fontFamily: "var(--font-geist-sans)" }}
                    onFocus={(e) => (e.target.style.borderColor = "#9C9189")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--cream-border)")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--ink-mid)" }}>
                    Role
                  </label>
                  <div className="space-y-2">
                    {(["agent", "broker", "coordinator"] as const).map((r) => {
                      const selected = form.role === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setForm({ ...form, role: r })}
                          className="w-full text-left px-4 py-3 rounded-lg border transition-all duration-150"
                          style={
                            selected
                              ? { background: "var(--ink)", borderColor: "var(--ink)" }
                              : { background: "var(--surface)", borderColor: "var(--cream-border)" }
                          }
                          onMouseEnter={(e) => {
                            if (!selected) (e.currentTarget as HTMLButtonElement).style.borderColor = "#9C9189";
                          }}
                          onMouseLeave={(e) => {
                            if (!selected) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--cream-border)";
                          }}
                        >
                          <p
                            className="text-sm font-semibold capitalize"
                            style={{ color: selected ? "var(--cream)" : "var(--ink)" }}
                          >
                            {r}
                          </p>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: selected ? "#C4B8A8" : "var(--ink-light)" }}
                          >
                            {ROLE_DESCRIPTIONS[r]}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={handleCreate}
                  disabled={!form.name.trim() || submitting}
                  className="w-full py-3 rounded-lg font-semibold text-sm transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
                  style={{ background: "var(--ink)", color: "var(--cream)" }}
                >
                  {submitting ? "Setting up Harriett..." : "Create account"}
                </button>
              </div>
            </>
          )}
        </div>
        </main>
      </div>
    </div>
  );
}
