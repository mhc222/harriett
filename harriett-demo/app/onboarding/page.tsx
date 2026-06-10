"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "../lib/auth";

const STEPS = [
  { label: "Reading your profile", delay: 800 },
  { label: "Setting up your workspace", delay: 1400 },
  { label: "Connecting to Pritchett-Moore", delay: 2000 },
  { label: "Loading your deals pipeline", delay: 2600 },
  { label: "Harriett is ready", delay: 3200 },
];

const ROLE_FLAVOR: Record<string, string> = {
  broker:
    "Wilson, I've loaded Jerrod's pending 604 Gordo deal and your approval queue. You have 1 message waiting for review.",
  agent:
    "Jerrod, I've found your pre-listing appointment for 2200 Academy Dr on Jun 12. I'll notify you when new contracts come in.",
  coordinator:
    "Alyssa, I'm watching the active listings. Forest Lake Dr photos are in queue for MLS entry.",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    setUser(u);

    STEPS.forEach((s, i) => {
      setTimeout(() => setStep(i + 1), s.delay);
    });

    setTimeout(() => setDone(true), 3800);
  }, [router]);

  // Auto-proceed 1 second after done; button stays as fallback
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.push("/dashboard"), 1000);
    return () => clearTimeout(t);
  }, [done, router]);

  function proceed() {
    router.push("/dashboard");
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4" style={{ background: "var(--cream)" }}>
      <div className="w-full max-w-sm text-center">
        <h1
          className="text-3xl font-bold tracking-tight mb-2"
          style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
        >
          Welcome to Harriett<span style={{ color: "var(--crimson)" }}>.</span>
        </h1>
        {user && (
          <p className="text-base mb-10" style={{ color: "var(--ink-mid)" }}>
            Good to meet you, {user.name.split(" ")[0]}.
          </p>
        )}

        <div className="space-y-3 text-left mb-10">
          {STEPS.map((s, i) => {
            const active = step > i;
            const current = step === i + 1 && !done;
            return (
              <div key={i} className="flex items-center gap-3 transition-opacity duration-300" style={{ opacity: active ? 1 : 0.3 }}>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                  style={{
                    background: active ? (i === STEPS.length - 1 ? "var(--crimson)" : "var(--ink)") : "var(--cream-border)",
                  }}
                >
                  {active && !current ? (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : current ? (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  ) : null}
                </div>
                <p className="text-sm font-medium" style={{ color: active ? "var(--ink)" : "var(--ink-light)" }}>
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>

        {done && user && ROLE_FLAVOR[user.role] && (
          <div
            className="text-left px-4 py-3 rounded-lg mb-6 border"
            style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}
          >
            <p className="text-sm leading-relaxed" style={{ color: "var(--ink-mid)" }}>
              {ROLE_FLAVOR[user.role]}
            </p>
          </div>
        )}

        {done && (
          <button
            onClick={proceed}
            className="w-full py-3 rounded-lg font-semibold text-sm transition-all duration-150 active:scale-[0.98]"
            style={{ background: "var(--ink)", color: "var(--cream)" }}
          >
            Go to dashboard →
          </button>
        )}
      </div>
    </div>
  );
}
