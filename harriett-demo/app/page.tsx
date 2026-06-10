import Link from "next/link";
import Image from "next/image";

function LogoPanel() {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center w-[45%] flex-shrink-0 relative overflow-hidden"
      style={{ background: "var(--ink)" }}>
      <div className="absolute top-7 left-8 flex items-center gap-3">
        <Image src="/harriett-logo.png" alt="Harriett." width={36} height={36} className="rounded-lg" />
        <span className="text-lg font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-playfair)", color: "#F5F0E8" }}>
          Harriett<span style={{ color: "var(--crimson)" }}>.</span>
        </span>
      </div>
      <Image
        src="/harriett-logo.png"
        alt="Harriett."
        width={420}
        height={420}
        className="rounded-3xl"
        style={{ boxShadow: "0 8px 64px 0 rgba(0,0,0,0.4)" }}
        priority
      />
      <p className="mt-8 text-base font-medium text-center max-w-xs"
        style={{ color: "#9C9189", fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
        The chief of staff your agents didn't know they wanted.
      </p>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex">
      <LogoPanel />

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12"
        style={{ background: "var(--cream)" }}>
        {/* Mobile logo */}
        <div className="lg:hidden text-center mb-10">
          <Image src="/harriett-logo.png" alt="Harriett." width={140} height={140}
            className="mx-auto rounded-2xl" style={{ boxShadow: "0 2px 16px 0 rgba(28,24,20,0.08)" }} priority />
          <p className="text-sm mt-3" style={{ color: "var(--ink-mid)" }}>Pritchett-Moore Real Estate</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight mb-1"
              style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
              Welcome back.
            </h1>
            <p className="text-sm" style={{ color: "var(--ink-mid)" }}>
              Pritchett-Moore Real Estate
            </p>
          </div>

          <div className="rounded-2xl border px-8 py-8"
            style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
            <p className="text-sm mb-6" style={{ color: "var(--ink-mid)" }}>
              Sign in to your workspace to continue.
            </p>
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.98]"
              style={{ background: "var(--ink)", color: "var(--cream)" }}
            >
              Sign in
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
