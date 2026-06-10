"use client";

import { useState, useEffect } from "react";
import UploadZone from "../components/UploadZone";
import HarriettOutput from "../components/HarriettOutput";
import type { DealFields } from "../lib/types";

type Stage = "upload" | "parsing" | "ready";

export default function Home() {
  const [stage, setStage] = useState<Stage>("upload");
  const [overlayActive, setOverlayActive] = useState(false);
  const [deal, setDeal] = useState<DealFields | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  async function parseDeal(file?: File) {
    setStage("parsing");
    setOverlayActive(true);
    setParseError(null);
    try {
      let res: Response;

      if (!file) {
        // Demo mode
        res = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demoMode: true }),
        });
      } else if (file.size > 4 * 1024 * 1024) {
        // Large file: upload to Supabase Storage first, then parse via storage path
        const urlRes = await fetch("/api/upload-url", { method: "POST" });
        if (!urlRes.ok) throw new Error("Could not get upload URL");
        const { signedUrl, path } = await urlRes.json();

        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": "application/pdf" },
        });
        if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);

        res = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storagePath: path }),
        });
      } else {
        // Small file: direct multipart
        const formData = new FormData();
        formData.append("file", file);
        res = await fetch("/api/parse", { method: "POST", body: formData });
      }

      if (res.status === 413) throw new Error("PDF too large. Try compressing it or use the sample transaction.");
      const text = await res.text();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(`Unexpected server response: ${text.slice(0, 120)}`); }
      if (!res.ok) throw new Error(data.error ?? "Parse failed");
      const isBlankTemplate =
        !data.address ||
        data.address.trim() === "" ||
        (!data.listPrice && !data.salePrice) ||
        !Array.isArray(data.sellers) ||
        data.sellers.length === 0;
      if (isBlankTemplate) {
        throw new Error("This looks like a blank template. Upload a completed, signed contract.");
      }
      setDeal(data);
      setStage("ready");
      // overlay stays active — dismissed by HarriettOutput via onChecklistReady callback
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Parse failed");
      setStage("upload");
      setOverlayActive(false);
    }
  }

  function reset() {
    setStage("upload");
    setDeal(null);
    setOverlayActive(false);
    setParseError(null);
  }

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--cream)" }}>
      <header className="px-6 py-3.5 flex-shrink-0 border-b" style={{ background: "var(--ink)", borderColor: "#2C2820" }}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="text-lg font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-playfair)", color: "#F5F0E8" }}
            >
              Harriett<span style={{ color: "var(--crimson)" }}>.</span>
            </span>
            <span className="text-sm hidden sm:block" style={{ color: "#6B6358" }}>Pritchett-Moore Real Estate</span>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex gap-5 text-sm">
              <a href="/dashboard" className="transition-colors" style={{ color: "#6B6358" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#D4CFC8")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6358")}
              >Dashboard</a>
              <a href="/calendar" className="transition-colors" style={{ color: "#6B6358" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#D4CFC8")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6358")}
              >Calendar</a>
              <span className="font-medium" style={{ color: "#D4CFC8" }}>Transaction</span>
              <a href="/pre-listing" className="transition-colors" style={{ color: "#6B6358" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#D4CFC8")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6358")}
              >Pre-Listing CMA</a>
            </nav>
            <button
              onClick={reset}
              className="text-sm px-3 py-1.5 rounded-lg transition-colors border"
              style={{
                color: "#9C9189",
                borderColor: "#3A342C",
                visibility: stage === "ready" && deal ? "visible" : "hidden",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#F5F0E8"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#6B635A"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9C9189"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#3A342C"; }}
            >
              New transaction
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative">
        {stage === "upload" && (
          <UploadZone
            onFile={(file) => parseDeal(file)}
            onSample={() => parseDeal()}
            error={parseError}
          />
        )}

        {(stage === "parsing" || (stage === "ready" && overlayActive)) && (
          <SkeletonBackground />
        )}

        {stage === "ready" && deal && (
          <div className={overlayActive ? "invisible" : ""}>
            <HarriettOutput
              deal={deal}
              onDealChange={setDeal}
              onChecklistReady={() => setOverlayActive(false)}
            />
          </div>
        )}

        {overlayActive && <ParseOverlay parseDone={stage === "ready"} />}
      </main>
    </div>
  );
}

const SKEL = "#E8E2D6";
const SKEL_BORDER = "var(--cream-border)";

const PARSE_STEPS = [
  "Reading document...",
  "Extracting deal details...",
  "Identifying parties...",
  "Checking compliance flags...",
  "Detecting disclosure requirements...",
  "Building transaction timeline...",
  "Building your checklist...",
];

function PulseBar({ w, h = "0.9rem", delay = 0 }: { w?: string; h?: string; delay?: number }) {
  return (
    <div
      className="animate-pulse rounded"
      style={{ width: w ?? "100%", height: h, background: SKEL, animationDelay: `${delay}ms` }}
    />
  );
}

// Steps 0: parse in flight. Steps 1-5: Claude extracted these (rapid after parse). Step 6: checklist in flight.
const ENRICH_STEPS = [1, 2, 3, 4, 5]; // auto-advance quickly once parse is done

function ParseOverlay({ parseDone }: { parseDone: boolean }) {
  // stepIndex = highest step currently active; completed = steps with checkmark
  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);

  useEffect(() => {
    if (!parseDone) return; // still reading — stay on step 0

    // Parse returned: mark step 0 done, then quickly walk steps 1-5, then land on step 6 (checklist)
    let i = 0;
    function advance() {
      const current = ENRICH_STEPS[i];
      if (current === undefined) return;
      setCompleted((c) => [...c, i === 0 ? 0 : ENRICH_STEPS[i - 1]]);
      setStepIndex(current);
      i++;
      if (i <= ENRICH_STEPS.length) {
        setTimeout(advance, 220);
      } else {
        // All enrich steps done, land on step 6 (checklist)
        setCompleted((c) => [...c, ENRICH_STEPS[ENRICH_STEPS.length - 1]]);
        setStepIndex(6);
      }
    }
    advance();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseDone]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(245,240,232,0.85)", backdropFilter: "blur(6px)" }}>
      <div className="rounded-2xl border shadow-xl px-12 py-10 w-[420px]" style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
        <p className="text-2xl font-semibold mb-8" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
          Harriett<span style={{ color: "var(--crimson)" }}>.</span>
        </p>
        <div className="flex flex-col gap-4">
          {PARSE_STEPS.map((step, i) => {
            const isDone = completed.includes(i);
            const isActive = i === stepIndex && !isDone;
            return (
              <div
                key={step}
                className="flex items-center gap-4 transition-all duration-500"
                style={{ opacity: i > stepIndex ? 0.3 : 1, color: isDone ? "var(--ink-mid)" : isActive ? "var(--ink)" : "var(--ink-light)" }}
              >
                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                  {isDone ? (
                    <svg viewBox="0 0 12 12" fill="none" className="w-4 h-4" style={{ color: "var(--crimson)" }}>
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : isActive ? (
                    <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: "var(--crimson)" }} />
                  ) : (
                    <div className="w-2 h-2 rounded-full" style={{ background: "var(--cream-border)" }} />
                  )}
                </div>
                <span className={`text-base ${isActive ? "font-medium" : ""}`}>{step}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SkeletonBackground() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 max-w-[1400px] mx-auto w-full flex flex-col md:flex-row gap-5 px-4 md:px-6 py-6">
        <div className="hidden md:block w-[268px] flex-shrink-0">
          <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: SKEL_BORDER }}>
            <div className="px-5 pt-5 pb-4 border-b space-y-2" style={{ borderColor: SKEL_BORDER }}>
              <PulseBar w="75%" h="1.1rem" />
              <PulseBar w="50%" delay={60} />
            </div>
            <div className="px-5 py-4 border-b grid grid-cols-2 gap-3" style={{ borderColor: SKEL_BORDER }}>
              <div className="space-y-1.5"><PulseBar w="2.5rem" h="0.7rem" /><PulseBar h="1.5rem" delay={80} /></div>
              <div className="space-y-1.5"><PulseBar w="3rem" h="0.7rem" /><PulseBar h="1.1rem" delay={120} /></div>
            </div>
            <div className="px-5 py-4 border-b space-y-2" style={{ borderColor: SKEL_BORDER }}>
              <PulseBar w="5rem" h="0.7rem" />
              {[0, 1].map((i) => <PulseBar key={i} h="1.75rem" delay={160 + i * 60} />)}
            </div>
            <div className="px-5 py-4 space-y-3">
              <PulseBar w="3.5rem" h="0.7rem" />
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-1">
                  <PulseBar w="4rem" h="0.65rem" delay={280 + i * 40} />
                  <PulseBar delay={300 + i * 40} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: SKEL_BORDER }}>
            <div className="border-b flex" style={{ borderColor: SKEL_BORDER }}>
              {["Transaction Checklist", "Marketing", "Agent Outreach"].map((label, i) => (
                <div key={label} className="flex-1 flex items-center justify-center px-4 py-3.5">
                  <PulseBar w="5rem" h="0.85rem" delay={i * 80} />
                </div>
              ))}
            </div>
            <div className="p-6 space-y-6">
              {[4, 3, 5].map((count, gi) => (
                <div key={gi}>
                  <PulseBar w="7rem" h="0.7rem" delay={gi * 100} />
                  <div className="mt-3 space-y-2">
                    {Array.from({ length: count }).map((_, i) => (
                      <div key={i} className="flex gap-3 items-start p-3 rounded-lg border" style={{ borderColor: SKEL_BORDER }}>
                        <div className="w-4 h-4 flex-shrink-0 mt-0.5 animate-pulse rounded" style={{ background: SKEL }} />
                        <div className="flex-1 space-y-1.5">
                          <PulseBar w="75%" delay={gi * 100 + i * 40} />
                          <PulseBar w={`${70 + (i % 3) * 10}%`} h="0.75rem" delay={gi * 100 + i * 40 + 20} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
