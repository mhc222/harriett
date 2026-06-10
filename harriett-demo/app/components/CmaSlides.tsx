"use client";

import { useState, useRef } from "react";
import type { CmaAnalysis, CmaInput } from "../lib/types";

interface Props {
  input: CmaInput;
  analysis: CmaAnalysis;
  onBack: () => void;
}

function fmt(n: number) {
  return "$" + n.toLocaleString();
}

function SlideWrapper({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl shadow-2xl"
      style={{
        aspectRatio: "16/9",
        display: "flex",
        flexDirection: "column",
        background: dark ? "var(--ink)" : "var(--surface)",
        color: dark ? "#F5F0E8" : "var(--ink)",
      }}
    >
      {children}
    </div>
  );
}

function SlideLogo({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className="absolute bottom-5 right-6 text-xs font-bold tracking-widest"
      style={{
        fontFamily: "var(--font-playfair)",
        opacity: 0.35,
        color: dark ? "#F5F0E8" : "var(--ink)",
      }}
    >
      Harriett<span style={{ color: "var(--crimson)" }}>.</span>
    </div>
  );
}

function SlideNumber({ n, total, dark = false }: { n: number; total: number; dark?: boolean }) {
  return (
    <div
      className="absolute top-5 right-6 text-xs font-mono"
      style={{ opacity: 0.35, color: dark ? "#F5F0E8" : "var(--ink)" }}
    >
      {n} / {total}
    </div>
  );
}

// Slide 1: Cover
function SlideCover({ input, n, total }: { input: CmaInput; n: number; total: number }) {
  return (
    <SlideWrapper dark>
      <div className="flex flex-col items-start justify-center h-full px-12 py-10 gap-4">
        <div
          className="text-xs font-bold tracking-[0.25em] uppercase mb-2"
          style={{ color: "var(--crimson)", letterSpacing: "0.25em" }}
        >
          Comparative Market Analysis
        </div>
        <h1 className="text-4xl font-bold leading-tight" style={{ color: "#F5F0E8" }}>
          {input.subjectAddress}
        </h1>
        <p className="text-xl" style={{ color: "#9C9189" }}>{input.subjectCity}</p>
        <div
          className="mt-6 pt-6 w-full grid grid-cols-2 gap-4 text-sm"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          <div>
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "#6B635A" }}>
              Prepared For
            </p>
            <p style={{ color: "#D4CFC8" }}>{input.sellerNames.join(", ")}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "#6B635A" }}>
              Prepared By
            </p>
            <p style={{ color: "#D4CFC8" }}>{input.agentName}</p>
            <p className="text-xs mt-0.5" style={{ color: "#6B635A" }}>
              Pritchett-Moore Real Estate
            </p>
          </div>
        </div>
        <div className="text-xs" style={{ color: "#6B635A" }}>
          {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </div>
        {input.agentName && (
          <div
            className="absolute bottom-5 left-12 text-xs italic"
            style={{ color: "#6B635A" }}
          >
            Prepared by Harriett for {input.agentName}
          </div>
        )}
      </div>
      <SlideLogo dark />
      <SlideNumber n={n} total={total} dark />
    </SlideWrapper>
  );
}

// Slide 2: Subject Property
function SlideSubject({
  input,
  analysis,
  n,
  total,
}: {
  input: CmaInput;
  analysis: CmaAnalysis;
  n: number;
  total: number;
}) {
  return (
    <SlideWrapper>
      <div className="flex flex-col h-full px-10 py-8">
        <div
          className="text-xs font-bold tracking-[0.2em] uppercase mb-1"
          style={{ color: "var(--crimson)" }}
        >
          Subject Property
        </div>
        <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--ink)" }}>
          {input.subjectAddress}, {input.subjectCity}
        </h2>
        <div className="grid grid-cols-2 gap-6 flex-1">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Bedrooms", value: String(input.subjectBeds) },
                { label: "Bathrooms", value: String(input.subjectBaths) },
                { label: "Square Feet", value: input.subjectSqft.toLocaleString() },
                {
                  label: "Year Built",
                  value: input.subjectYearBuilt ? String(input.subjectYearBuilt) : "Pre-1978",
                },
                {
                  label: "Price/Sq Ft",
                  value: "$" + Math.round(analysis.pricingRange.recommended / input.subjectSqft),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg p-3"
                  style={{ background: "var(--cream)", border: "1px solid var(--cream-border)" }}
                >
                  <p className="text-xs mb-0.5" style={{ color: "var(--ink-light)" }}>
                    {item.label}
                  </p>
                  <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            {input.subjectNotes && (
              <p
                className="text-xs italic pl-3"
                style={{
                  color: "var(--ink-mid)",
                  borderLeft: "2px solid var(--crimson)",
                  opacity: 0.8,
                }}
              >
                {input.subjectNotes}
              </p>
            )}
          </div>
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-3"
              style={{ color: "var(--ink-light)" }}
            >
              Key Highlights
            </p>
            <ul className="space-y-2">
              {analysis.subjectHighlights.map((h, i) => (
                <li key={i} className="flex gap-2 text-sm" style={{ color: "var(--ink-mid)" }}>
                  <span className="flex-shrink-0 mt-0.5" style={{ color: "var(--crimson)" }}>
                    —
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <SlideLogo />
      <SlideNumber n={n} total={total} />
    </SlideWrapper>
  );
}

// Slide 3: Comparable Sales Table
function SlideComps({
  input,
  analysis,
  n,
  total,
}: {
  input: CmaInput;
  analysis: CmaAnalysis;
  n: number;
  total: number;
}) {
  const subjectPpsf = Math.round(analysis.pricingRange.recommended / input.subjectSqft);
  return (
    <SlideWrapper>
      <div className="flex flex-col h-full px-10 py-8">
        <div
          className="text-xs font-bold tracking-[0.2em] uppercase mb-1"
          style={{ color: "var(--crimson)" }}
        >
          Comparable Sales
        </div>
        <h2 className="text-2xl font-bold mb-5" style={{ color: "var(--ink)" }}>
          Recent Market Activity
        </h2>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid var(--cream-border)" }}>
                {["Address", "Sold", "Price", "Sqft", "$/Sqft"].map((h, i) => (
                  <th
                    key={h}
                    className={`py-2 text-xs font-semibold uppercase tracking-wide ${i > 0 ? "text-right" : "text-left"}`}
                    style={{ color: "var(--ink-light)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {input.comps.map((comp, i) => {
                const ppsf = Math.round(comp.salePrice / comp.sqft);
                const note = analysis.compNotes.find((n) =>
                  n.address.includes(comp.address.split(",")[0])
                );
                return (
                  <tr key={i} style={{ borderBottom: "1px solid var(--cream-border)" }}>
                    <td className="py-3">
                      <p className="font-medium" style={{ color: "var(--ink)" }}>
                        {comp.address}
                      </p>
                      <p className="text-xs" style={{ color: "var(--ink-light)" }}>
                        {comp.city} · {comp.beds}bd/{comp.baths}ba · {comp.sqft.toLocaleString()} sqft
                      </p>
                      {note && (
                        <p className="text-xs mt-0.5 italic" style={{ color: "var(--crimson)" }}>
                          {note.adjustmentNote}
                        </p>
                      )}
                    </td>
                    <td
                      className="py-3 text-right whitespace-nowrap"
                      style={{ color: "var(--ink-mid)" }}
                    >
                      {comp.saleDate}
                    </td>
                    <td className="py-3 text-right font-semibold" style={{ color: "var(--ink)" }}>
                      {fmt(comp.salePrice)}
                    </td>
                    <td className="py-3 text-right" style={{ color: "var(--ink-mid)" }}>
                      {comp.sqft.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className="font-semibold"
                        style={{ color: ppsf >= subjectPpsf ? "#166534" : "#B45309" }}
                      >
                        ${ppsf}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr
                className="rounded-b"
                style={{ background: "#FEF2F2", borderTop: "2px solid #FECACA" }}
              >
                <td
                  colSpan={4}
                  className="py-2.5 text-xs font-bold uppercase tracking-wide"
                  style={{
                    color: "var(--crimson)",
                    borderLeft: "3px solid var(--crimson)",
                    paddingLeft: "0.625rem",
                  }}
                >
                  Subject Property — {input.subjectAddress}
                </td>
                <td
                  className="py-2.5 text-right font-bold"
                  style={{ color: "var(--crimson)" }}
                >
                  ${subjectPpsf}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <SlideLogo />
      <SlideNumber n={n} total={total} />
    </SlideWrapper>
  );
}

// Slide 4: Price Analysis
function SlideAnalysis({
  input,
  analysis,
  n,
  total,
}: {
  input: CmaInput;
  analysis: CmaAnalysis;
  n: number;
  total: number;
}) {
  const subjectPpsf = Math.round(analysis.pricingRange.recommended / input.subjectSqft);
  const allPpsf = [
    ...input.comps.map((c) => ({
      label: c.address.split(",")[0],
      ppsf: Math.round(c.salePrice / c.sqft),
      isSubject: false,
    })),
    { label: "Subject (rec.)", ppsf: subjectPpsf, isSubject: true },
  ];
  const maxPpsf = Math.max(...allPpsf.map((p) => p.ppsf)) * 1.15;

  return (
    <SlideWrapper>
      <div className="flex flex-col h-full px-10 py-8">
        <div
          className="text-xs font-bold tracking-[0.2em] uppercase mb-1"
          style={{ color: "var(--crimson)" }}
        >
          Price Analysis
        </div>
        <h2 className="text-2xl font-bold mb-5" style={{ color: "var(--ink)" }}>
          Price Per Square Foot Comparison
        </h2>
        <div className="flex-1 flex gap-8">
          <div className="flex-1">
            <div className="flex items-end gap-3 h-36">
              {allPpsf.map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
                    ${item.ppsf}
                  </span>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${(item.ppsf / maxPpsf) * 120}px`,
                      background: item.isSubject ? "var(--crimson)" : "var(--cream-border)",
                    }}
                  />
                  <span
                    className="text-xs text-center leading-tight mt-1 truncate w-full text-center"
                    style={{ color: "var(--ink-mid)" }}
                  >
                    {item.label.length > 12 ? item.label.substring(0, 12) + "…" : item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-52 space-y-4">
            <div
              className="rounded-xl p-4"
              style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
            >
              <p
                className="text-xs uppercase tracking-wide font-semibold mb-1"
                style={{ color: "var(--crimson)" }}
              >
                Recommended Price
              </p>
              <p className="text-2xl font-bold" style={{ color: "var(--crimson)" }}>
                {fmt(analysis.pricingRange.recommended)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#B45309" }}>
                ${subjectPpsf}/sqft
              </p>
            </div>
            <div
              className="rounded-xl p-4"
              style={{ background: "var(--cream)", border: "1px solid var(--cream-border)" }}
            >
              <p
                className="text-xs uppercase tracking-wide font-semibold mb-2"
                style={{ color: "var(--ink-light)" }}
              >
                Pricing Range
              </p>
              <div className="space-y-1 text-sm">
                {[
                  { label: "Conservative", val: analysis.pricingRange.low },
                  { label: "Balanced", val: analysis.pricingRange.mid },
                  { label: "Optimistic", val: analysis.pricingRange.high },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between">
                    <span style={{ color: "var(--ink-mid)" }}>{r.label}</span>
                    <span className="font-medium" style={{ color: "var(--ink)" }}>
                      {fmt(r.val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <SlideLogo />
      <SlideNumber n={n} total={total} />
    </SlideWrapper>
  );
}

// Slide 5: Recommendation
function SlideRecommendation({ analysis, n, total }: { analysis: CmaAnalysis; n: number; total: number }) {
  return (
    <SlideWrapper dark>
      <div className="flex flex-col h-full px-12 py-10">
        <div
          className="text-xs font-bold tracking-[0.2em] uppercase mb-4"
          style={{ color: "var(--crimson)" }}
        >
          Pricing Recommendation
        </div>
        <div className="grid grid-cols-2 gap-8 flex-1">
          <div className="flex flex-col justify-center">
            <p className="text-sm mb-2" style={{ color: "#9C9189" }}>
              Recommended List Price
            </p>
            <p className="text-6xl font-bold mb-1" style={{ color: "#F5F0E8" }}>
              {fmt(analysis.pricingRange.recommended)}
            </p>
            <p className="text-sm" style={{ color: "#9C9189" }}>
              {analysis.daysOnMarketEstimate} estimated days on market
            </p>
            <div
              className="mt-6 pt-6 grid grid-cols-3 gap-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
            >
              {[
                { label: "Low", value: analysis.pricingRange.low },
                { label: "Mid", value: analysis.pricingRange.mid },
                { label: "High", value: analysis.pricingRange.high },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs mb-1" style={{ color: "#6B635A" }}>
                    {item.label}
                  </p>
                  <p className="text-base font-semibold" style={{ color: "#D4CFC8" }}>
                    {fmt(item.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-between py-2">
            <div>
              <p
                className="text-xs uppercase tracking-wide font-semibold mb-2"
                style={{ color: "#6B635A" }}
              >
                Rationale
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#D4CFC8" }}>
                {analysis.pricingRationale}
              </p>
            </div>
            <p className="text-xs italic" style={{ color: "#6B635A" }}>
              Draft — for agent review before presenting to seller. Harriett is an AI assistant; all pricing decisions rest with the listing agent.
            </p>
          </div>
        </div>
      </div>
      <SlideLogo dark />
      <SlideNumber n={n} total={total} dark />
    </SlideWrapper>
  );
}

// Slide 6: Market Context
function SlideMarket({ analysis, n, total }: { analysis: CmaAnalysis; n: number; total: number }) {
  return (
    <SlideWrapper>
      <div className="flex flex-col h-full px-10 py-8">
        <div
          className="text-xs font-bold tracking-[0.2em] uppercase mb-1"
          style={{ color: "var(--crimson)" }}
        >
          Market Context
        </div>
        <h2 className="text-2xl font-bold mb-5" style={{ color: "var(--ink)" }}>
          Strengths, Considerations & Market
        </h2>
        <div className="grid grid-cols-3 gap-5 flex-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#166534" }}>
              Strengths
            </p>
            <ul className="space-y-2">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm" style={{ color: "var(--ink-mid)" }}>
                  <span className="flex-shrink-0" style={{ color: "#166534" }}>
                    +
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#B45309" }}>
              Considerations
            </p>
            <ul className="space-y-2">
              {analysis.considerations.map((c, i) => (
                <li key={i} className="flex gap-2 text-sm" style={{ color: "var(--ink-mid)" }}>
                  <span className="flex-shrink-0" style={{ color: "#B45309" }}>
                    —
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-3"
              style={{ color: "var(--ink-light)" }}
            >
              Market Conditions
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--ink-mid)" }}>
              {analysis.marketConditions}
            </p>
          </div>
        </div>
        <p className="text-xs italic mt-4" style={{ color: "var(--ink-light)" }}>
          Draft for agent review. Harriett is an AI assistant; all pricing decisions rest with the listing agent.
        </p>
      </div>
      <SlideLogo />
      <SlideNumber n={n} total={total} />
    </SlideWrapper>
  );
}

const TOTAL_SLIDES = 6;

export default function CmaSlides({ input, analysis, onBack }: Props) {
  const [current, setCurrent] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function prev() {
    setCurrent((c) => Math.max(0, c - 1));
  }
  function next() {
    setCurrent((c) => Math.min(TOTAL_SLIDES - 1, c + 1));
  }

  function togglePresent() {
    if (!presenting && containerRef.current) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    setPresenting((p) => !p);
  }

  function printSlides() {
    window.print();
  }

  const slides = [
    <SlideCover key={0} input={input} n={1} total={TOTAL_SLIDES} />,
    <SlideSubject key={1} input={input} analysis={analysis} n={2} total={TOTAL_SLIDES} />,
    <SlideComps key={2} input={input} analysis={analysis} n={3} total={TOTAL_SLIDES} />,
    <SlideAnalysis key={3} input={input} analysis={analysis} n={4} total={TOTAL_SLIDES} />,
    <SlideRecommendation key={4} analysis={analysis} n={5} total={TOTAL_SLIDES} />,
    <SlideMarket key={5} analysis={analysis} n={6} total={TOTAL_SLIDES} />,
  ];

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Controls */}
      <div className="flex items-center justify-between mb-4 no-print">
        <button
          onClick={onBack}
          className="text-sm flex items-center gap-1 transition-colors"
          style={{ color: "var(--ink-mid)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink-mid)")}
        >
          ← Edit inputs
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={printSlides}
            className="text-sm px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: "var(--cream-border)", color: "var(--ink-mid)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--cream)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            Export PDF
          </button>
          <button
            onClick={togglePresent}
            className="text-sm px-4 py-1.5 rounded-lg font-medium transition-all"
            style={{ background: "var(--ink)", color: "var(--cream)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#2C2820")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--ink)")}
          >
            Present
          </button>
        </div>
      </div>

      {/* Slide */}
      <div
        ref={containerRef}
        className={presenting ? "fixed inset-0 flex items-center justify-center z-50" : ""}
        style={presenting ? { background: "var(--ink)" } : {}}
      >
        <div className={presenting ? "w-full max-w-5xl mx-auto px-4" : "w-full"}>
          {slides[current]}
        </div>

        {/* Navigation */}
        <div
          className={`flex items-center justify-between mt-4 no-print ${
            presenting ? "absolute bottom-6 left-0 right-0 px-8" : ""
          }`}
        >
          <button
            onClick={prev}
            disabled={current === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "var(--cream)", color: "var(--ink-mid)", border: "1px solid var(--cream-border)" }}
            onMouseEnter={(e) => !e.currentTarget.disabled && ((e.currentTarget as HTMLButtonElement).style.background = "var(--cream-border)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--cream)")}
          >
            ← Prev
          </button>

          <div className="flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === current ? "1.5rem" : "0.5rem",
                  height: "0.5rem",
                  background: i === current ? "var(--crimson)" : "var(--cream-border)",
                }}
              />
            ))}
          </div>

          <button
            onClick={next}
            disabled={current === TOTAL_SLIDES - 1}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "var(--cream)", color: "var(--ink-mid)", border: "1px solid var(--cream-border)" }}
            onMouseEnter={(e) => !e.currentTarget.disabled && ((e.currentTarget as HTMLButtonElement).style.background = "var(--cream-border)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--cream)")}
          >
            Next →
          </button>
        </div>

        {presenting && (
          <button
            onClick={togglePresent}
            className="absolute top-4 right-4 text-sm"
            style={{ color: "#6B635A" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#9C9189")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#6B635A")}
          >
            Exit ✕
          </button>
        )}
      </div>

      {/* Summary bar */}
      <div
        className="mt-6 rounded-xl p-4 border no-print"
        style={{ background: "#FEF2F2", borderColor: "#FECACA" }}
      >
        <p className="text-sm font-medium mb-1" style={{ color: "var(--crimson)" }}>
          Harriett&apos;s Summary
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--ink-mid)" }}>
          {analysis.executiveSummary}
        </p>
        <p className="text-xs mt-2 italic" style={{ color: "var(--ink-light)" }}>
          Draft — agent reviews before presenting to seller.
        </p>
      </div>

      {/* Print-only: all slides stacked */}
      <div className="print-only hidden">
        {slides.map((slide, i) => (
          <div key={i} className="print-slide">
            {slide}
          </div>
        ))}
      </div>
    </div>
  );
}
