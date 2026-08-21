"use client";

import Link from "next/link";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-1.5 rounded-full border border-ink/10 px-4 py-1.5 text-xs font-medium text-stone transition-colors hover:border-teal/30 hover:text-teal print:hidden"
    >
      <PrintIcon />
      Print / Save PDF
    </button>
  );
}

function PrintIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M4 6V2h8v4M4 11H2V6h12v5h-2M4 9h8v5H4V9z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DocHeader({
  title,
  subtitle,
  date = "June 2026",
}: {
  title: string;
  subtitle?: string;
  date?: string;
}) {
  return (
    <>
      <header className="flex items-center justify-between px-8 py-5 hairline-t print:hairline-t">
        <Link href="/docs" className="font-display text-lg font-bold text-ink print:pointer-events-none">
          Harriett.
        </Link>
        <div className="flex items-center gap-3 print:hidden">
          <Link href="/docs" className="text-xs text-stone hover:text-teal transition-colors">
            All deliverables
          </Link>
          <PrintButton />
        </div>
      </header>

      <div className="border-b border-ink/10 bg-cream/60 px-8 py-10">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-teal">
          Pritchett-Moore Real Estate — {date}
        </p>
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-sm text-stone leading-relaxed">{subtitle}</p>
        )}
      </div>
    </>
  );
}

export function DocFooter() {
  return (
    <footer className="mt-16 hairline-t px-8 py-8 print:mt-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-stone">
          Prepared by Prairie Dog Labs for Pritchett-Moore Real Estate
        </p>
        <p className="text-xs text-stone">matt@pdlabs.xyz · pdlabs.xyz</p>
      </div>
    </footer>
  );
}
