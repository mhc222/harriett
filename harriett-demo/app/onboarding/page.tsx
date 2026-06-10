"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getUser } from "../lib/auth";
import { VENDORS, VENDOR_LABELS } from "../lib/demo-data";

const TONES = [
  { id: "warm-direct", label: "Warm and direct", desc: "Get to the point, but always make folks feel at home." },
  { id: "professional", label: "Professional and polished", desc: "Formal, precise. Your paperwork always reflects well on you." },
  { id: "casual", label: "Casual and friendly", desc: "Easy, conversational. You text like you talk." },
  { id: "energetic", label: "Energetic", desc: "High energy. People can feel your excitement." },
];

const CONNECTIONS = [
  {
    id: "m365",
    label: "Microsoft 365",
    sub: "Read your inbox and calendar",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
        <rect x="2" y="2" width="9" height="9" fill="#F25022" rx="1" />
        <rect x="13" y="2" width="9" height="9" fill="#7FBA00" rx="1" />
        <rect x="2" y="13" width="9" height="9" fill="#00A4EF" rx="1" />
        <rect x="13" y="13" width="9" height="9" fill="#FFB900" rx="1" />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    sub: "Post listings and market updates",
    icon: (
      <svg viewBox="0 0 24 24" fill="#1877F2" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    id: "instagram",
    label: "Instagram",
    sub: "Share photos and stories",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5">
        <defs>
          <linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f09433" />
            <stop offset="25%" stopColor="#e6683c" />
            <stop offset="50%" stopColor="#dc2743" />
            <stop offset="75%" stopColor="#cc2366" />
            <stop offset="100%" stopColor="#bc1888" />
          </linearGradient>
        </defs>
        <path fill="url(#ig)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Tanner Ashcraft");
  const [step, setStep] = useState(1);
  const TOTAL = 4;

  // Step 1
  const [name, setName] = useState("Tanner Ashcraft");
  const [signoff, setSignoff] = useState("");

  // Step 2
  const [tones, setTones] = useState<string[]>(["warm-direct"]);

  // Step 3
  const [selectedVendors, setSelectedVendors] = useState<string[]>(VENDORS.map((v) => v.id));

  // Step 4
  const [connected, setConnected] = useState<string[]>([]);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    setUserName(u.name);
    setName(u.name);
  }, [router]);

  function toggleTone(id: string) {
    setTones((t) => t.includes(id) ? t.filter((x) => x !== id) : [...t, id]);
  }

  function toggleVendor(id: string) {
    setSelectedVendors((v) => v.includes(id) ? v.filter((x) => x !== id) : [...v, id]);
  }

  function toggleConnection(id: string) {
    setConnected((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);
  }

  function finish() {
    if (typeof window !== "undefined") {
      localStorage.setItem("harriett_prefs", JSON.stringify({ name, signoff, tones, selectedVendors, connections: connected }));
    }
    router.push("/dashboard");
  }

  const firstName = (userName || name).split(" ")[0];

  return (
    <div style={{ background: "#1C1814", minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* Face / logo */}
        <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: "2px solid #3C3530", marginBottom: 14, flexShrink: 0 }}>
          <Image src="/harriett-logo.png" alt="Harriett" width={80} height={80} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
        </div>

        {/* Wordmark */}
        <p style={{ fontSize: 26, fontWeight: 600, color: "#F5F0E8", letterSpacing: "-0.02em", margin: "0 0 4px" }}>
          Harriett<span style={{ color: "#B91C1C" }}>.</span>
        </p>
        <p style={{ fontSize: 10, color: "#6B5E52", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 22px" }}>
          Pritchett-Moore Real Estate
        </p>

        {/* Progress bar */}
        <div style={{ width: "100%", display: "flex", gap: 6, marginBottom: 28 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < step ? "#B91C1C" : "#3C3530", transition: "background 0.3s" }} />
          ))}
        </div>

        {/* Card */}
        <div style={{ background: "#F5F0E8", borderRadius: 16, padding: 32, width: "100%" }}>

          {step === 1 && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#B91C1C", margin: "0 0 10px" }}>Step 1 of 4</p>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: "#1C1814", lineHeight: 1.35, margin: "0 0 8px" }}>
                Before we get started, I need to know who I'm working with.
              </h2>
              <p style={{ fontSize: 13, color: "#6B5E52", lineHeight: 1.6, margin: "0 0 24px" }}>
                I'll use your name and signature in every message I draft. It'll sound like you — not like software.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  style={{ background: "#fff", border: "1px solid #E8E2D8", borderRadius: 10, padding: "12px 16px", fontFamily: "Georgia, serif", fontSize: 14, color: "#1C1814", outline: "none" }}
                />
                <input
                  type="text"
                  value={signoff}
                  onChange={(e) => setSignoff(e.target.value)}
                  placeholder="How you sign off (e.g. T-Money, Tanner)"
                  style={{ background: "#fff", border: "1px solid #E8E2D8", borderRadius: 10, padding: "12px 16px", fontFamily: "Georgia, serif", fontSize: 14, color: "#1C1814", outline: "none" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setStep(2)} disabled={!name.trim()}
                  style={{ background: "#1C1814", color: "#F5F0E8", border: "none", borderRadius: 10, padding: "12px 28px", fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: name.trim() ? 1 : 0.5 }}>
                  Let's go &rarr;
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#B91C1C", margin: "0 0 10px" }}>Step 2 of 4</p>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: "#1C1814", lineHeight: 1.35, margin: "0 0 8px" }}>
                How do you like to talk to clients?
              </h2>
              <p style={{ fontSize: 13, color: "#6B5E52", lineHeight: 1.6, margin: "0 0 20px" }}>
                Pick everything that fits. I'll match your style in every draft.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {TONES.map((t) => {
                  const sel = tones.includes(t.id);
                  return (
                    <button key={t.id} onClick={() => toggleTone(t.id)}
                      style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${sel ? "#1C1814" : "#E8E2D8"}`, background: sel ? "#1C1814" : "#fff", cursor: "pointer", transition: "all 0.15s" }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: sel ? "#F5F0E8" : "#1C1814", margin: "0 0 2px" }}>{t.label}</p>
                      <p style={{ fontSize: 11, color: sel ? "#C4B8A8" : "#6B5E52", margin: 0 }}>{t.desc}</p>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={() => setStep(1)} style={{ background: "none", border: "none", color: "#9C9189", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                  &larr; Back
                </button>
                <button onClick={() => setStep(3)} disabled={tones.length === 0}
                  style={{ background: "#1C1814", color: "#F5F0E8", border: "none", borderRadius: 10, padding: "12px 28px", fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: tones.length > 0 ? 1 : 0.5 }}>
                  That's right &rarr;
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#B91C1C", margin: "0 0 10px" }}>Step 3 of 4</p>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: "#1C1814", lineHeight: 1.35, margin: "0 0 8px" }}>
                Who do you work with?
              </h2>
              <p style={{ fontSize: 13, color: "#6B5E52", lineHeight: 1.6, margin: "0 0 20px" }}>
                I'll reach out to these vendors on your behalf when you need them. Uncheck anyone you don't use.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
                {VENDORS.map((v) => {
                  const sel = selectedVendors.includes(v.id);
                  return (
                    <button key={v.id} onClick={() => toggleVendor(v.id)}
                      style={{ textAlign: "left", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${sel ? "#1C1814" : "#E8E2D8"}`, background: sel ? "#1C1814" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.15s" }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: sel ? "#F5F0E8" : "#1C1814", margin: "0 0 1px" }}>{v.name}</p>
                        <p style={{ fontSize: 10, color: sel ? "#9C9189" : "#6B5E52", margin: 0 }}>{VENDOR_LABELS[v.category]} &middot; {v.contact}</p>
                      </div>
                      <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${sel ? "#F5F0E8" : "#D4CFC8"}`, background: sel ? "#F5F0E8" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {sel && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2.5 2.5L8 3" stroke="#1C1814" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={() => setStep(2)} style={{ background: "none", border: "none", color: "#9C9189", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                  &larr; Back
                </button>
                <button onClick={() => setStep(4)}
                  style={{ background: "#1C1814", color: "#F5F0E8", border: "none", borderRadius: 10, padding: "12px 28px", fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Got it &rarr;
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#B91C1C", margin: "0 0 10px" }}>Step 4 of 4</p>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: "#1C1814", lineHeight: 1.35, margin: "0 0 8px" }}>
                Connect your accounts.
              </h2>
              <p style={{ fontSize: 13, color: "#6B5E52", lineHeight: 1.6, margin: "0 0 20px" }}>
                Connect your accounts and I can work for you, not just with you. You can always do this later.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                {CONNECTIONS.map((c) => {
                  const isConnected = connected.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => toggleConnection(c.id)}
                      style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${isConnected ? "#BBF7D0" : "#E8E2D8"}`, background: isConnected ? "#F0FDF4" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s" }}>
                      <div style={{ flexShrink: 0 }}>{c.icon}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1C1814", margin: "0 0 1px" }}>{c.label}</p>
                        <p style={{ fontSize: 11, color: "#6B5E52", margin: 0 }}>{c.sub}</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: isConnected ? "#166534" : "#9C9189", flexShrink: 0 }}>
                        {isConnected ? "Connected" : "Connect"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={() => setStep(3)} style={{ background: "none", border: "none", color: "#9C9189", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                  &larr; Back
                </button>
                <button onClick={finish}
                  style={{ background: "#B91C1C", color: "#F5F0E8", border: "none", borderRadius: 10, padding: "12px 28px", fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  I'm ready &rarr;
                </button>
              </div>
            </>
          )}

        </div>

        {/* Skip link on step 4 */}
        {step === 4 && (
          <button onClick={finish} style={{ marginTop: 16, background: "none", border: "none", color: "#6B5E52", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>
            Skip for now
          </button>
        )}

      </div>
    </div>
  );
}
