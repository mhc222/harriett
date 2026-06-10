"use client";

import { useRef, useState } from "react";

interface Props {
  onFile: (file: File) => void;
  onSample: () => void;
  error: string | null;
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 48 48" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="4" width="28" height="40" rx="3" />
      <path d="M28 4v10h8" />
      <path d="M15 26h18M15 32h12" />
    </svg>
  );
}

export default function UploadZone({ onFile, onSample, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      alert("Upload a PDF.");
      return;
    }
    onFile(file);
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "var(--ink)", fontFamily: "var(--font-geist-sans)" }}
          >
            Drop a transaction document
          </h1>
          <p className="text-base mt-2" style={{ color: "var(--ink-mid)" }}>
            Harriett reads the contract, builds the checklist, and writes the marketing.
          </p>
        </div>

        <div
          className={`group relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
            dragging ? "border-[#9B1C1C] bg-red-50" : "hover:border-[#9C9189]"
          }`}
          style={{
            borderColor: dragging ? undefined : "var(--cream-border)",
            background: dragging ? undefined : "var(--surface)",
          }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
        >
          <div className="flex justify-center mb-4">
            <DocumentIcon
              className={`w-12 h-12 transition-colors duration-200 ${
                dragging ? "text-[#9B1C1C]" : "text-[#C8BFB4] group-hover:text-[#9C9189]"
              }`}
            />
          </div>

          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-mid)" }}>
            Listing agreements, purchase contracts,
            <br />
            closing statements, inspection reports
          </p>

          <div className="mt-6">
            <span
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 active:scale-[0.98]"
              style={{ background: dragging ? "var(--crimson)" : "var(--ink)", color: "var(--cream)" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Upload PDF
            </span>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl border" style={{ background: "#FEF2F2", borderColor: "#FCA5A5" }}>
            <p className="text-sm" style={{ color: "var(--crimson)" }}>{error}</p>
          </div>
        )}

        <div className="mt-5 text-center">
          <button
            onClick={onSample}
            className="text-sm transition-colors hover:underline underline-offset-2"
            style={{ color: "var(--ink-light)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink-mid)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-light)")}
          >
            No PDF? Load the Gordo, AL sample transaction
          </button>
        </div>
      </div>
    </div>
  );
}
