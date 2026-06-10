"use client";

import { useState, useRef, useEffect } from "react";

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
  "What are the compliance flags for the Gordo deal?",
  "Who are the sellers and what is their contact info?",
  "What did the loan type change from and why does it matter?",
  "Walk me through the coordinator checklist for a pending sale.",
  "What is Jerrod's commission on this deal?",
  "What vendors does Harriett know about for this file?",
  "What is the net to seller and how was it calculated?",
  "What disclosures are required for this property?",
  "Does Alabama require sellers to disclose defects?",
  "What is the earnest money rule in Alabama?",
  "Who must handle the closing in Alabama?",
  "What changed with Act 2025-59?",
  "Give me the full Gordo deal timeline with all key dates.",
  "Was the lead paint window met for Gordo? When did it expire?",
  "What did the FHA loan type change require and by when?",
  "When did coordinator tasks need to happen after contract signed?",
];

export default function AgentPage() {
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
  const [memTab, setMemTab] = useState<"chat" | "memory">("chat");
  const [showSources, setShowSources] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    const res = await fetch("/api/memory/list?userId=jerrod-hastings");
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

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--cream)" }}>
      {/* Nav */}
      <header className="px-6 py-3.5 flex-shrink-0 border-b" style={{ background: "var(--ink)", borderColor: "#2C2820" }}>
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-playfair)", color: "#F5F0E8" }}>
              Harriett<span style={{ color: "var(--crimson)" }}>.</span>
            </span>
            <span className="text-xs px-2 py-1 rounded-md" style={{ background: "#2C2820", color: "#9C9189" }}>
              Agent Brain Test
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-medium" style={{ color: "#D4CFC8" }}>Tanner Ashcraft</p>
              <p className="text-[10px]" style={{ color: "#6B6358" }}>Associate Broker</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col max-w-[1200px] mx-auto w-full px-4 py-5">
        {/* Deal context banner */}
        <div className="rounded-xl border px-5 py-3.5 mb-4 flex items-center justify-between flex-shrink-0"
          style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
          <div className="flex items-center gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--ink-light)" }}>Active Deal</p>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>604 2nd St NW, Gordo, AL 35466</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--ink-mid)" }}>
                Sellers: Rohrer, Chung, Vuong &middot; Buyers: Shaina + Kevin Fields &middot; Closed Jun 5, 2026 &middot; $208,000 FHA
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              {[
                { label: "Agent", value: "Jerrod Hastings" },
                { label: "Title", value: "North River Title" },
                { label: "Lender", value: "First Federal Bank" },
              ].map((item) => (
                <div key={item.label} className="text-center px-4 border-l" style={{ borderColor: "var(--cream-border)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--ink-light)" }}>{item.label}</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: "var(--ink)" }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {memories.length > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold leading-none" style={{ color: "#166534" }}>{memories.length}</p>
                <p className="text-[10px]" style={{ color: "var(--ink-light)" }}>memories</p>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {!seeded ? (
                <button onClick={() => seedMemory(false)} disabled={seeding}
                  className="text-sm font-semibold px-4 py-2 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{ background: "var(--crimson)", color: "white" }}>
                  {seeding ? "Loading..." : "Load Gordo Deal"}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0" }}>
                    Deal loaded
                  </span>
                  <button onClick={() => seedMemory(true)} disabled={seeding}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-all"
                    style={{ borderColor: "var(--cream-border)", color: "var(--ink-mid)" }}>
                    {seeding ? "..." : "Reload"}
                  </button>
                </div>
              )}
              {!seededLaw ? (
                <button onClick={seedLaw} disabled={seedingLaw}
                  className="text-sm font-semibold px-4 py-2 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{ background: "var(--ink)", color: "var(--cream)" }}>
                  {seedingLaw ? "Loading..." : "Load AL Law"}
                </button>
              ) : (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0" }}>
                  AL Law loaded
                </span>
              )}
              {!seededTimeline ? (
                <button onClick={seedTimeline} disabled={seedingTimeline}
                  className="text-sm font-semibold px-4 py-2 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{ background: "#0369A1", color: "white" }}>
                  {seedingTimeline ? "Loading..." : "Load Timelines"}
                </button>
              ) : (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0" }}>
                  Timelines loaded
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab strip */}
        <div className="flex gap-1 mb-3 flex-shrink-0">
          {[{ key: "chat", label: "Ask Harriett" }, { key: "memory", label: `Memory (${memories.length})` }].map((t) => (
            <button key={t.key} onClick={() => { setMemTab(t.key as "chat" | "memory"); if (t.key === "memory") loadMemories(); }}
              className="text-xs font-semibold px-4 py-2 rounded-lg transition-all"
              style={memTab === t.key
                ? { background: "var(--ink)", color: "var(--cream)" }
                : { background: "transparent", color: "var(--ink-mid)" }
              }>
              {t.label}
            </button>
          ))}
        </div>

        {memTab === "memory" ? (
          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border"
            style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
            {memories.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-sm" style={{ color: "var(--ink-mid)" }}>No memories loaded. Click "Load Gordo Deal into Harriett's Memory" above.</p>
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
                    Ask Harriett about the 604 Gordo deal.
                  </p>
                  <p className="text-xs mb-5" style={{ color: "var(--ink-mid)" }}>
                    Load memory first, then ask any question about the transaction, parties, compliance flags, or office procedures.
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
                placeholder={seeded ? "Ask Harriett about the Gordo deal..." : "Load memory first, then ask..."}
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
    </div>
  );
}
