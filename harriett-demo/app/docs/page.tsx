import Link from "next/link";
import { DocFooter } from "./DocShell";

export const metadata = {
  title: "Harriett — Phase 1 Deliverables | Prairie Dog Labs",
};

const DOCS = [
  {
    href: "/docs/sow",
    label: "Phase 2 Statement of Work",
    description:
      "$31,800 fixed-price SOW for the Harriett pilot. Covers the M365 integration, three coordination workflows, pre-listing support, A2P 10DLC registration, and AI Enablement Kickstart. Includes payment schedule and signature block.",
    badge: "Phase 2 SOW",
    badgeColor: "bg-teal/10 text-teal",
  },
  {
    href: "/docs/workflow",
    label: "Workflow and System Map",
    description:
      "Every workflow Harriett handles, what accounts and integrations unlock each capability, and which phase each piece arrives. The reference for what to connect and when.",
    badge: "Client-facing",
    badgeColor: "bg-teal/10 text-teal",
  },
];

export default function DocsIndex() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between px-8 py-5 border-b border-ink/10">
        <span className="font-display text-lg font-bold text-ink">Harriett.</span>
      </header>

      {/* Hero */}
      <div className="border-b border-ink/10 bg-cream/60 px-8 py-12">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-teal">
          Phase 1 Deliverables
        </p>
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          Pritchett-Moore Real Estate
        </h1>
        <p className="mt-3 max-w-xl text-sm text-stone leading-relaxed">
          AI transaction assistant for Pritchett-Moore Real Estate, Tuscaloosa AL.
          Documents below cover system capabilities, integration requirements, and operating costs.
        </p>
      </div>

      <main className="px-8 py-12">
        <div className="mx-auto max-w-2xl space-y-10">

          {/* Video */}
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-teal">Demo</p>
            <div className="rounded-xl overflow-hidden border border-ink/10 shadow-sm bg-ink">
              <video
                src="/harriett-demo.mp4"
                controls
                className="w-full"
                poster=""
              />
            </div>
          </div>

          {/* Doc cards */}
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-teal">Documents</p>
            <div className="space-y-4">
              {DOCS.map((doc) => (
                <Link
                  key={doc.href}
                  href={doc.href}
                  className="group block rounded-xl border border-ink/10 bg-offwhite p-6 shadow-sm transition-all hover:border-teal/30 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="font-display text-base font-semibold text-ink group-hover:text-teal transition-colors">
                        {doc.label}
                      </h2>
                      <p className="mt-2 text-sm text-stone leading-relaxed">
                        {doc.description}
                      </p>
                    </div>
                    <ArrowIcon />
                  </div>
                  <div className="mt-4">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${doc.badgeColor}`}>
                      {doc.badge}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Demo link */}
          <div className="rounded-xl border border-teal/20 bg-teal/5 p-6">
            <p className="text-sm font-semibold text-teal mb-1">Live Demo</p>
            <p className="text-sm text-stone mb-3 leading-relaxed">
              The working demo runs on the real Gordo transaction. Log in as Jerrod Hastings to see Harriett in action.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90 transition-colors"
            >
              Open demo
              <ArrowIcon light />
            </Link>
          </div>

        </div>
      </main>

      <DocFooter />
    </div>
  );
}

function ArrowIcon({ light = false }: { light?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={`mt-0.5 h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${light ? "text-white/80" : "text-stone group-hover:text-teal"}`}
      aria-hidden
    >
      <path
        d="M4.5 11.5L11.5 4.5M11.5 4.5H6M11.5 4.5V10"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
