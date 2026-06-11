"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, clearUser, type HarriettUser } from "../lib/auth";
import AppSidebar from "../components/AppSidebar";
import { VENDORS, VENDOR_LABELS, type Vendor } from "../lib/demo-data";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  memoriesUsed?: string[];
}

interface MemoryEntry {
  id: string;
  memory: string;
  created_at?: string;
}

const SUGGESTED = [
  "Draft a Just Listed post for a 3BR/2BA in Northport.",
  "What marketing materials can you help me create for a new listing?",
  "Walk me through the coordinator checklist for a pending sale.",
  "What disclosures are required for a pre-1978 property in Alabama?",
  "Draft a follow-up text to a buyer's agent after an accepted offer.",
  "What is the earnest money rule in Alabama?",
  "Does Alabama require sellers to disclose defects?",
  "Who must handle the closing in Alabama?",
  "What changed with Act 2025-59?",
  "What vendors do I have set up for photography and inspections?",
  "Help me write a listing description for a 4BR on the lake.",
  "What forms does PM require an agent to initial before a file is accepted?",
  "Draft a text to my client about their closing next week.",
  "What is the lead-based paint disclosure rule?",
  "What questions should I ask a seller at a listing appointment?",
  "What are the FHA loan requirements I should know as a listing agent?",
];

function detectChips(text: string): { showSend: boolean; showFacebook: boolean } {
  const lower = text.toLowerCase();
  const isShort = text.length < 250;
  const isDeflection =
    lower.startsWith("i don't have") ||
    lower.startsWith("i don't currently") ||
    lower.startsWith("nothing loaded") ||
    lower.startsWith("no listings") ||
    lower.startsWith("i'm not sure") ||
    lower.startsWith("i wasn't able") ||
    lower.startsWith("i can't") ||
    lower.startsWith("i cannot");
  const isSocial =
    (lower.includes("just listed") ||
      lower.includes("just sold") ||
      lower.includes("new listing") ||
      lower.includes("for sale") ||
      lower.includes("listing description") ||
      lower.includes("mls remarks")) &&
    text.length > 200;
  const isSubstantial = !isShort && !isDeflection;
  return { showSend: isSubstantial, showFacebook: isSocial };
}

export default function AgentPage() {
  const router = useRouter();
  const [user, setUser] = useState<HarriettUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [seedingLaw, setSeedingLaw] = useState(false);
  const [seededLaw, setSeededLaw] = useState(false);
  const [seedingTimeline, setSeedingTimeline] = useState(false);
  const [seededTimeline, setSeededTimeline] = useState(false);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [memTab, setMemTab] = useState<"chat" | "memory" | "vendors">("chat");
  const [showSources, setShowSources] = useState<number | null>(null);
  const [sendStates, setSendStates] = useState<Record<number, { whatsapp: "idle" | "loading" | "sent" | "error"; email: "idle" | "loading" | "sent" | "error" }>>({});
  const [fbPreview, setFbPreview] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);


  async function seedMemory(reset = false) {
    setSeeding(true);
    try {
      const res = await fetch("/api/memory/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset }),
      });
      const data = await res.json();
      if (data.ok) { setSeeded(true); await loadMemories(); }
    } finally { setSeeding(false); }
  }

  async function seedLaw() {
    setSeedingLaw(true);
    try {
      const res = await fetch("/api/memory/seed-law", { method: "POST" });
      const data = await res.json();
      if (data.ok) { setSeededLaw(true); await loadMemories(); }
    } finally { setSeedingLaw(false); }
  }

  async function seedTimeline() {
    setSeedingTimeline(true);
    try {
      const res = await fetch("/api/memory/seed-timeline", { method: "POST" });
      const data = await res.json();
      if (data.ok) { setSeededTimeline(true); await loadMemories(); }
    } finally { setSeedingTimeline(false); }
  }

  async function loadMemories() {
    const u = getUser();
    const userId = u?.id ?? "unknown";
    const res = await fetch(`/api/memory/list?userId=${userId}`);
    const data = await res.json();
    setMemories(data.results ?? []);
  }

  async function sendMessage(question?: string) {
    const q = (question ?? input).trim();
    if (!q || loading) return;
    setInput("");

    const userMsg: ChatMessage = { role: "user", content: q };
    setMessages((p) => [...p, userMsg]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history }),
      });
      const data = await res.json();
      setMessages((p) => [
        ...p,
        { role: "assistant", content: data.answer, memoriesUsed: data.memoriesUsed },
      ]);
    } catch {
      setMessages((p) => [
        ...p,
        { role: "assistant", content: "Something went wrong. Try again." },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }


  async function sendToMe(type: "whatsapp" | "email", content: string, msgIndex: number) {
    setSendStates((s) => ({
      ...s,
      [msgIndex]: { ...(s[msgIndex] ?? { whatsapp: "idle" as const, email: "idle" as const }), [type]: "loading" as const },
    }));
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content, subject: `From Harriett — ${user?.name ?? "Harriett"}` }),
      });
      const data = await res.json();
      setSendStates((s) => ({
        ...s,
        [msgIndex]: { ...(s[msgIndex] ?? { whatsapp: "idle" as const, email: "idle" as const }), [type]: data.ok ? ("sent" as const) : ("error" as const) },
      }));
    } catch {
      setSendStates((s) => ({
        ...s,
        [msgIndex]: { ...(s[msgIndex] ?? { whatsapp: "idle" as const, email: "idle" as const }), [type]: "error" as const },
      }));
    }
  }

  return (
    <div className="min-h-[100dvh] flex" style={{ background: "var(--cream)" }}>
      <AppSidebar />

      <main className="flex-1 min-h-0 flex flex-col px-4 py-5 overflow-y-auto">

        {/* Agent profile banner */}
        <div className="rounded-xl border px-5 py-3.5 mb-4 flex items-center justify-between flex-shrink-0"
          style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "var(--crimson)" }}>
              {user?.initials ?? "TA"}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{user?.name ?? "Tanner Ashcraft"}</p>
              <p className="text-xs" style={{ color: "var(--ink-mid)" }}>{user?.title ?? "Associate Broker"} &middot; Pritchett-Moore Real Estate</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0" }}>
              {memories.length > 0 ? `${memories.length} memories` : "No memories yet"}
            </span>
          </div>
        </div>

        {/* Tab strip */}
        <div className="flex gap-1 mb-3 flex-shrink-0">
          {[
            { key: "chat", label: "Ask Harriett" },
            { key: "vendors", label: "Vendors" },
            { key: "memory", label: `Memory (${memories.length})` },
          ].map((t) => (
            <button key={t.key}
              onClick={() => {
                setMemTab(t.key as "chat" | "memory" | "vendors");
                if (t.key === "memory") loadMemories();
              }}
              className="text-xs font-semibold px-4 py-2 rounded-lg transition-all"
              style={memTab === t.key
                ? { background: "var(--ink)", color: "var(--cream)" }
                : { background: "transparent", color: "var(--ink-mid)" }
              }>
              {t.label}
            </button>
          ))}
        </div>

        {memTab === "vendors" ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="grid gap-3 pb-4">
              {VENDORS.map((v) => (
                <VendorCard key={v.id} vendor={v}
                  dealAddress=""
                  dealCity=""
                  dealClosingDate=""
                  dealAgent={user?.name ?? ""}
                  onSendMessage={async (content) => {
                    const res = await fetch("/api/send", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ type: "whatsapp", content, subject: `Vendor: ${v.name}` }),
                    });
                    return (await res.json()).ok === true;
                  }} />
              ))}
            </div>
          </div>
        ) : memTab === "memory" ? (
          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border"
            style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
            {memories.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-sm" style={{ color: "var(--ink-mid)" }}>No memories loaded.</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--cream-border)" }}>
                {memories.map((m, i) => (
                  <div key={m.id} className="px-4 py-3 flex items-start gap-3">
                    <span className="text-[10px] font-bold w-5 flex-shrink-0 mt-0.5" style={{ color: "var(--ink-light)" }}>{i + 1}</span>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--ink)" }}>{m.memory}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Chat area */}
            <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border mb-3"
              style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
              {messages.length === 0 ? (
                <div className="p-5">
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Ask Harriett anything.
                  </p>
                  <p className="text-xs mb-5" style={{ color: "var(--ink-mid)" }}>
                    Ask any question about the transaction, parties, compliance flags, or office procedures.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {SUGGESTED.map((s) => (
                      <button key={s} onClick={() => sendMessage(s)}
                        className="text-left text-xs px-3 py-2.5 rounded-xl border transition-all"
                        style={{ borderColor: "var(--cream-border)", color: "var(--ink-mid)", background: "var(--cream)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ink-mid)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--cream-border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-mid)"; }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] ${msg.role === "user" ? "" : ""}`}>
                        {msg.role === "user" ? (
                          <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm"
                            style={{ background: "var(--ink)", color: "var(--cream)" }}>
                            {msg.content}
                          </div>
                        ) : (
                          <div>
                            <div className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed"
                              style={{ background: "var(--cream)", border: "1px solid var(--cream-border)", color: "var(--ink)", whiteSpace: "pre-wrap" }}>
                              {msg.content}
                            </div>
                            {msg.memoriesUsed && msg.memoriesUsed.length > 0 && (
                              <button onClick={() => setShowSources(showSources === i ? null : i)}
                                className="mt-1 text-[10px] font-medium transition-colors"
                                style={{ color: showSources === i ? "var(--crimson)" : "var(--ink-light)" }}>
                                {showSources === i ? "Hide" : `Show ${msg.memoriesUsed.length} memory sources`}
                              </button>
                            )}
                            {showSources === i && msg.memoriesUsed && (
                              <div className="mt-2 space-y-1">
                                {msg.memoriesUsed.map((m, j) => (
                                  <div key={j} className="text-[10px] px-3 py-2 rounded-lg leading-relaxed"
                                    style={{ background: "#F5F0E8", color: "var(--ink-mid)", border: "1px solid var(--cream-border)" }}>
                                    {m}
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Action chips — conditional on response type */}
                            {(() => {
                              const { showSend, showFacebook } = detectChips(msg.content);
                              if (!showSend && !showFacebook) return null;
                              return (
                                <div className="flex gap-2 mt-2.5 flex-wrap">
                                  {showSend && ([
                                    { type: "whatsapp" as const, idle: "Text me this", sent: "Sent via WhatsApp" },
                                    { type: "email" as const, idle: "Email me this", sent: "Sent via email" },
                                  ]).map(({ type, idle, sent }) => {
                                    const state = sendStates[i]?.[type] ?? "idle";
                                    return (
                                      <button key={type}
                                        onClick={() => state === "idle" && sendToMe(type, msg.content, i)}
                                        disabled={state === "loading" || state === "sent"}
                                        className="text-[11px] px-3 py-1.5 rounded-lg border transition-all disabled:cursor-default"
                                        style={{
                                          borderColor: state === "sent" ? "#BBF7D0" : state === "error" ? "#FECACA" : "var(--cream-border)",
                                          background: state === "sent" ? "#F0FDF4" : state === "error" ? "#FEF2F2" : "var(--cream)",
                                          color: state === "sent" ? "#166534" : state === "error" ? "var(--crimson)" : "var(--ink-mid)",
                                        }}>
                                        {state === "loading" ? "Sending..." : state === "sent" ? sent : state === "error" ? "Failed — retry" : idle}
                                      </button>
                                    );
                                  })}
                                  {showFacebook && (
                                    <button
                                      onClick={() => setFbPreview(msg.content)}
                                      className="text-[11px] px-3 py-1.5 rounded-lg border transition-all"
                                      style={{ borderColor: "var(--cream-border)", background: "var(--cream)", color: "var(--ink-mid)" }}>
                                      Facebook preview
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="px-4 py-3 rounded-2xl rounded-tl-sm"
                        style={{ background: "var(--cream)", border: "1px solid var(--cream-border)" }}>
                        <div className="flex items-center gap-1.5">
                          {[0, 1, 2].map((d) => (
                            <div key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                              style={{ background: "var(--ink-light)", animationDelay: `${d * 150}ms` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2 flex-shrink-0">
              <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask Harriett..."
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                style={{ background: "var(--surface)", borderColor: "var(--cream-border)", color: "var(--ink)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ink-mid)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--cream-border)")}
              />
              <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                className="px-5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ background: "var(--ink)", color: "var(--cream)" }}>
                Ask
              </button>
            </div>
          </>
        )}
      </main>

      {/* Facebook preview modal */}
      {fbPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(28,24,20,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setFbPreview(null)}>
          <div className="rounded-2xl shadow-2xl w-full max-w-[500px] overflow-hidden"
            style={{ background: "#fff" }}
            onClick={(e) => e.stopPropagation()}>
            {/* FB chrome */}
            <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: "#E4E6EB" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: "#1877F2" }}>PM</div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#050505" }}>Pritchett-Moore Real Estate</p>
                <p className="text-xs" style={{ color: "#65676B" }}>Just now &middot; Public</p>
              </div>
              <button onClick={() => setFbPreview(null)}
                className="ml-auto text-lg leading-none px-2"
                style={{ color: "#65676B" }}>
                &times;
              </button>
            </div>
            <div className="px-4 py-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#050505" }}>
                {fbPreview.slice(0, 600)}{fbPreview.length > 600 ? "..." : ""}
              </p>
            </div>
            <div className="px-4 pb-4 flex gap-2">
              <button
                onClick={async () => {
                  const lastIdx = messages.filter(m => m.role === "assistant").length - 1;
                  await sendToMe("email", fbPreview, lastIdx);
                  setFbPreview(null);
                }}
                className="text-sm px-4 py-2 rounded-lg font-semibold transition-all"
                style={{ background: "var(--ink)", color: "var(--cream)" }}>
                Email me this draft
              </button>
              <button onClick={() => setFbPreview(null)}
                className="text-sm px-4 py-2 rounded-lg border transition-all"
                style={{ borderColor: "var(--cream-border)", color: "var(--ink-mid)" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Vendor Card ───────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  photographer: { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" },
  inspector:    { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  title:        { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0" },
  lender:       { bg: "#F0F9FF", text: "#0369A1", border: "#BAE6FD" },
  appraiser:    { bg: "#FFF7ED", text: "#9A3412", border: "#FED7AA" },
  insurance:    { bg: "#FDF4FF", text: "#86198F", border: "#F0ABFC" },
  deed:         { bg: "#F8FAFC", text: "#475569", border: "#CBD5E1" },
  other:        { bg: "#F5F0E8", text: "#1C1814", border: "#E8E2D8" },
};

function VendorCard({ vendor, dealAddress, dealCity, dealClosingDate, dealAgent, onSendMessage }: {
  vendor: Vendor;
  dealAddress: string;
  dealCity: string;
  dealClosingDate: string;
  dealAgent: string;
  onSendMessage: (content: string) => Promise<boolean>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const colors = CATEGORY_COLORS[vendor.category] ?? CATEGORY_COLORS.other;

  async function draftOutreach() {
    setDrafting(true);
    try {
      const res = await fetch("/api/vendor/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor: { name: vendor.name, contact: vendor.contact, phone: vendor.phone, email: vendor.email, category: vendor.category },
          deal: { address: dealAddress || "your next listing", city: dealCity || "Tuscaloosa, AL", closingDate: dealClosingDate || "", agent: dealAgent || "Tanner Ashcraft" },
          proposedDates: vendor.freeDates ?? [],
        }),
      });
      const data = await res.json();
      setDraft(data.sms ?? data.whatsapp ?? data.message ?? "Could not generate draft.");
    } catch {
      setDraft("Draft failed. Try again.");
    } finally {
      setDrafting(false);
    }
  }

  async function sendDraft() {
    if (!draft) return;
    setSending(true);
    const ok = await onSendMessage(draft);
    setSending(false);
    if (ok) setSent(true);
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
      <button className="w-full text-left px-5 py-4 flex items-center gap-4" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{vendor.name}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
              {VENDOR_LABELS[vendor.category]}
            </span>
            {vendor.harriettCanContact && (
              <span className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0" }}>
                Harriett can contact
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: "var(--ink-mid)" }}>
            {vendor.contact} &middot; {vendor.phone}
            {vendor.lastUsed ? ` &middot; Last used ${vendor.lastUsed}` : ""}
          </p>
        </div>
        <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          style={{ color: "var(--ink-light)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t pt-4 space-y-3" style={{ borderColor: "var(--cream-border)" }}>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {vendor.phone && (
              <div>
                <p className="font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--ink-light)", fontSize: "10px" }}>Phone</p>
                <p style={{ color: "var(--ink)" }}>{vendor.phone}</p>
              </div>
            )}
            {vendor.email && (
              <div>
                <p className="font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--ink-light)", fontSize: "10px" }}>Email</p>
                <p style={{ color: "var(--ink)" }}>{vendor.email}</p>
              </div>
            )}
            {vendor.freeDates && vendor.freeDates.length > 0 && (
              <div className="col-span-2">
                <p className="font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--ink-light)", fontSize: "10px" }}>Available dates</p>
                <div className="flex gap-2 flex-wrap">
                  {vendor.freeDates.map((d) => (
                    <span key={d} className="px-2 py-1 rounded-lg text-xs"
                      style={{ background: "var(--cream)", border: "1px solid var(--cream-border)", color: "var(--ink-mid)" }}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {vendor.harriettCanContact && (
            <div className="space-y-2">
              {!draft ? (
                <button onClick={draftOutreach} disabled={drafting}
                  className="text-xs px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-60"
                  style={{ background: "var(--ink)", color: "var(--cream)" }}>
                  {drafting ? "Drafting..." : "Draft outreach message"}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap"
                    style={{ background: "var(--cream)", border: "1px solid var(--cream-border)", color: "var(--ink)" }}>
                    {draft}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={sendDraft} disabled={sending || sent}
                      className="text-xs px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-60"
                      style={{
                        background: sent ? "#F0FDF4" : "var(--crimson)",
                        color: sent ? "#166534" : "white",
                        border: sent ? "1px solid #BBF7D0" : "none",
                      }}>
                      {sending ? "Sending..." : sent ? "Sent via WhatsApp" : "Send via WhatsApp"}
                    </button>
                    <button onClick={() => { setDraft(null); setSent(false); }}
                      className="text-xs px-3 py-2 rounded-lg border transition-all"
                      style={{ borderColor: "var(--cream-border)", color: "var(--ink-mid)" }}>
                      Redraft
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
