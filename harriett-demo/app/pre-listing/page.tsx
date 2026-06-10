"use client";

import { useState } from "react";
import Link from "next/link";
import CmaSlides from "../components/CmaSlides";
import type { CmaInput, CmaComp, CmaAnalysis } from "../lib/types";

const DEFAULT_COMPS: CmaComp[] = [
  {
    address: "807 9th St NW",
    city: "Gordo, AL 35466",
    salePrice: 190000,
    sqft: 1487,
    beds: 3,
    baths: 2,
    saleDate: "Dec 2025",
    yearBuilt: 1955,
    notes: "Same city, similar vintage, slightly larger",
  },
  {
    address: "445 11th St SE",
    city: "Gordo, AL 35466",
    salePrice: 225000,
    sqft: 1592,
    beds: 3,
    baths: 2,
    saleDate: "Apr 2026",
    yearBuilt: 1960,
    notes: "Gordo, updated interior, larger lot",
  },
  {
    address: "122 20th Ave SW",
    city: "Reform, AL 35481",
    salePrice: 165000,
    sqft: 1320,
    beds: 3,
    baths: 2,
    saleDate: "Nov 2025",
    yearBuilt: 1950,
    notes: "Reform, smaller footprint, older condition",
  },
  {
    address: "616 7th St NW",
    city: "Reform, AL 35481",
    salePrice: 260000,
    sqft: 2355,
    beds: 3,
    baths: 2,
    saleDate: "Mar 2026",
    yearBuilt: 1965,
    notes: "Reform, significantly larger — size adjustment needed",
  },
];

const DEFAULT_INPUT: CmaInput = {
  subjectAddress: "604 2nd St NW",
  subjectCity: "Gordo, AL 35466",
  subjectSqft: 1380,
  subjectBeds: 3,
  subjectBaths: 2,
  subjectYearBuilt: 1948,
  subjectNotes:
    "Pre-1978 construction — lead paint disclosure required. Appliances included (refrigerator, washer, dryer). Detached garage. Private backyard with swing. Municipal sewer. Ridge Sub subdivision.",
  sellerNames: ["Larry Chung", "Xuan Vuong", "Amy Rohrer"],
  agentName: "Jerrod Hastings",
  comps: DEFAULT_COMPS,
};

type Stage = "input" | "generating" | "slides";

const INPUT_CLASS =
  "w-full rounded-lg px-3 py-2 text-sm border transition-colors focus:outline-none focus:ring-2";

function inputStyle() {
  return {
    background: "var(--cream)",
    borderColor: "var(--cream-border)",
    color: "var(--ink)",
  };
}

const EMPTY_INPUT: CmaInput = {
  subjectAddress: "",
  subjectCity: "",
  subjectSqft: 0,
  subjectBeds: 3,
  subjectBaths: 2,
  subjectYearBuilt: null,
  subjectNotes: "",
  sellerNames: [],
  agentName: "",
  comps: [],
};

export default function PreListingPage() {
  const [input, setInput] = useState<CmaInput>(DEFAULT_INPUT);
  const [stage, setStage] = useState<Stage>("input");
  const [analysis, setAnalysis] = useState<CmaAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateComp(index: number, patch: Partial<CmaComp>) {
    setInput((prev) => ({
      ...prev,
      comps: prev.comps.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  }

  function addComp() {
    setInput((prev) => ({
      ...prev,
      comps: [
        ...prev.comps,
        { address: "", city: "", salePrice: 0, sqft: 0, beds: 3, baths: 2, saleDate: "", yearBuilt: null, notes: "" },
      ],
    }));
  }

  function removeComp(index: number) {
    setInput((prev) => ({ ...prev, comps: prev.comps.filter((_, i) => i !== index) }));
  }

  async function generate() {
    setSubmitting(true);
    setError(null);
    // brief delay so the button loading state is visible before the full-page transition
    await new Promise((r) => setTimeout(r, 400));
    setStage("generating");
    setSubmitting(false);
    try {
      const res = await fetch("/api/cma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalysis(data);
      setStage("slides");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setStage("input");
    }
  }

  if (stage === "generating") {
    return (
      <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--cream)" }}>
        <PreListingHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div
              className="inline-block w-9 h-9 rounded-full border-2 border-t-transparent animate-spin mb-5"
              style={{ borderColor: "var(--cream-border)", borderTopColor: "var(--crimson)" }}
            />
            <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>
              Harriett is analyzing the comps...
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--ink-mid)" }}>
              Building your CMA presentation
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "slides" && analysis) {
    return (
      <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--cream)" }}>
        <PreListingHeader showBack={() => setStage("input")} />
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-6 py-8">
          <CmaSlides input={input} analysis={analysis} onBack={() => setStage("input")} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--cream)" }}>
      <PreListingHeader />
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-10">
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: "var(--crimson)" }}
              >
                Pre-Listing
              </p>
              <h2
                className="text-2xl font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
              >
                CMA Presentation Builder
              </h2>
              <p className="text-sm mt-1.5" style={{ color: "var(--ink-mid)" }}>
                Enter the subject property and comparable sales. Harriett analyzes the comps and builds a client-ready presentation.
              </p>
            </div>
            <button
              onClick={() => setInput(EMPTY_INPUT)}
              className="text-xs transition-colors mt-1 flex-shrink-0 ml-6"
              style={{ color: "var(--ink-light)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink-mid)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink-light)")}
            >
              Clear form
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {/* Subject Property */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}
          >
            <div
              className="px-5 py-3.5 border-b"
              style={{ borderColor: "var(--cream-border)", background: "var(--cream)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-mid)" }}>
                Subject Property
              </p>
            </div>
            <div className="px-5 py-5 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--ink-light)" }}>
                  Address
                </label>
                <input
                  className={INPUT_CLASS}
                  style={inputStyle()}
                  value={input.subjectAddress}
                  onChange={(e) => setInput({ ...input, subjectAddress: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--ink-light)" }}>
                  City, State, Zip
                </label>
                <input
                  className={INPUT_CLASS}
                  style={inputStyle()}
                  value={input.subjectCity}
                  onChange={(e) => setInput({ ...input, subjectCity: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--ink-light)" }}>
                  Year Built
                </label>
                <input
                  type="number"
                  className={INPUT_CLASS}
                  style={inputStyle()}
                  value={input.subjectYearBuilt ?? ""}
                  onChange={(e) => setInput({ ...input, subjectYearBuilt: parseInt(e.target.value) || null })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--ink-light)" }}>
                  Square Feet
                </label>
                <input
                  type="number"
                  className={INPUT_CLASS}
                  style={inputStyle()}
                  value={input.subjectSqft}
                  onChange={(e) => setInput({ ...input, subjectSqft: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--ink-light)" }}>
                  Beds / Baths
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className={INPUT_CLASS}
                    style={inputStyle()}
                    value={input.subjectBeds}
                    onChange={(e) => setInput({ ...input, subjectBeds: parseInt(e.target.value) || 0 })}
                  />
                  <input
                    type="number"
                    className={INPUT_CLASS}
                    style={inputStyle()}
                    value={input.subjectBaths}
                    onChange={(e) => setInput({ ...input, subjectBaths: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--ink-light)" }}>
                  Property Notes
                </label>
                <textarea
                  rows={2}
                  className={INPUT_CLASS}
                  style={{ ...inputStyle(), resize: "none" }}
                  value={input.subjectNotes}
                  onChange={(e) => setInput({ ...input, subjectNotes: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--ink-light)" }}>
                  Seller Names
                </label>
                <input
                  className={INPUT_CLASS}
                  style={inputStyle()}
                  value={input.sellerNames.join(", ")}
                  onChange={(e) => setInput({ ...input, sellerNames: e.target.value.split(",").map((s) => s.trim()) })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--ink-light)" }}>
                  Listing Agent
                </label>
                <input
                  className={INPUT_CLASS}
                  style={inputStyle()}
                  value={input.agentName}
                  onChange={(e) => setInput({ ...input, agentName: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Comparable Sales */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}
          >
            <div
              className="px-5 py-3.5 border-b flex items-center justify-between"
              style={{ borderColor: "var(--cream-border)", background: "var(--cream)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-mid)" }}>
                Comparable Sales
              </p>
              <button
                onClick={addComp}
                className="text-xs font-medium transition-colors"
                style={{ color: "var(--crimson)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--crimson-hover)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--crimson)")}
              >
                + Add comp
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              {input.comps.map((comp, i) => (
                <div
                  key={i}
                  className="rounded-lg border p-4"
                  style={{ borderColor: "var(--cream-border)", background: "var(--cream)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p
                      className="text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: "var(--ink-light)" }}
                    >
                      Comp {i + 1}
                    </p>
                    <button
                      onClick={() => removeComp(i)}
                      className="text-xs transition-colors"
                      style={{ color: "var(--ink-light)" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--crimson)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink-light)")}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--ink-light)" }}>
                        Address
                      </label>
                      <input
                        className={INPUT_CLASS}
                        style={{ ...inputStyle(), background: "var(--surface)" }}
                        value={comp.address}
                        onChange={(e) => updateComp(i, { address: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--ink-light)" }}>
                        City
                      </label>
                      <input
                        className={INPUT_CLASS}
                        style={{ ...inputStyle(), background: "var(--surface)" }}
                        value={comp.city}
                        onChange={(e) => updateComp(i, { city: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--ink-light)" }}>
                        Sale Price
                      </label>
                      <input
                        type="number"
                        className={INPUT_CLASS}
                        style={{ ...inputStyle(), background: "var(--surface)" }}
                        value={comp.salePrice}
                        onChange={(e) => updateComp(i, { salePrice: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--ink-light)" }}>
                        Sqft
                      </label>
                      <input
                        type="number"
                        className={INPUT_CLASS}
                        style={{ ...inputStyle(), background: "var(--surface)" }}
                        value={comp.sqft}
                        onChange={(e) => updateComp(i, { sqft: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--ink-light)" }}>
                        Sale Date
                      </label>
                      <input
                        className={INPUT_CLASS}
                        style={{ ...inputStyle(), background: "var(--surface)" }}
                        value={comp.saleDate}
                        onChange={(e) => updateComp(i, { saleDate: e.target.value })}
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--ink-light)" }}>
                        Notes
                      </label>
                      <input
                        className={INPUT_CLASS}
                        style={{ ...inputStyle(), background: "var(--surface)" }}
                        value={comp.notes}
                        onChange={(e) => updateComp(i, { notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: "var(--crimson)" }}>
              {error}
            </p>
          )}

          <button
            onClick={generate}
            disabled={submitting}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.99] flex items-center justify-center gap-2.5 disabled:opacity-80"
            style={{ background: "var(--ink)", color: "var(--cream)" }}
            onMouseEnter={(e) => !submitting && ((e.currentTarget as HTMLButtonElement).style.background = "#2C2820")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--ink)")}
          >
            {submitting ? (
              <>
                <span
                  className="inline-block w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
                  style={{ borderColor: "rgba(245,240,232,0.3)", borderTopColor: "var(--cream)" }}
                />
                Harriett is building your CMA&hellip;
              </>
            ) : (
              "Build CMA Presentation"
            )}
          </button>
          <p className="text-xs text-center" style={{ color: "var(--ink-light)" }}>
            Harriett is an AI assistant. All pricing is a draft for agent review — never autonomous pricing advice.
          </p>
        </div>
      </div>
    </div>
  );
}

function PreListingHeader({ showBack }: { showBack?: () => void }) {
  return (
    <header
      className="px-6 py-3.5 flex-shrink-0 border-b"
      style={{ background: "var(--ink)", borderColor: "#2C2820" }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-playfair)", color: "#F5F0E8" }}
          >
            Harriett<span style={{ color: "var(--crimson)" }}>.</span>
          </span>
          <nav className="hidden md:flex items-center gap-5">
            {[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Calendar", href: "/calendar" },
              { label: "Transaction", href: "/demo" },
              { label: "Pre-Listing CMA", href: "/pre-listing", active: true },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm transition-colors"
                style={{ color: item.active ? "#D4CFC8" : "#6B6358", fontWeight: item.active ? 500 : 400 }}
                onMouseEnter={(e) => !item.active && (e.currentTarget.style.color = "#D4CFC8")}
                onMouseLeave={(e) => !item.active && (e.currentTarget.style.color = "#6B6358")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        {showBack && (
          <button
            onClick={showBack}
            className="text-sm px-3 py-1.5 rounded-lg border transition-colors"
            style={{ color: "#9C9189", borderColor: "#3A342C" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#F5F0E8";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#6B635A";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#9C9189";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#3A342C";
            }}
          >
            Edit inputs
          </button>
        )}
      </div>
    </header>
  );
}
