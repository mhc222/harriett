import Image from "next/image";
import Link from "next/link";

export function LegalPage({
  title,
  eyebrow,
  updated,
  privacyHref = "/privacy",
  smsTermsHref = "/sms-terms",
  smsEnrollmentHref,
  children,
}: {
  title: string;
  eyebrow: string;
  updated: string;
  privacyHref?: string;
  smsTermsHref?: string;
  smsEnrollmentHref?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-[100dvh]" style={{ background: "var(--cream)" }}>
      <header className="border-b" style={{ borderColor: "var(--cream-border)", background: "var(--surface)" }}>
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/harriett-logo.png" alt="Harriett." width={34} height={34} className="rounded-lg" />
            <span
              className="text-lg font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
            >
              Harriett<span style={{ color: "var(--crimson)" }}>.</span>
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-sm" style={{ color: "var(--ink-mid)" }}>
            {smsEnrollmentHref && (
              <Link href={smsEnrollmentHref} className="transition-colors hover:text-black">
                SMS Enrollment
              </Link>
            )}
            <Link href={privacyHref} className="transition-colors hover:text-black">
              Privacy
            </Link>
            <Link href={smsTermsHref} className="transition-colors hover:text-black">
              SMS Terms
            </Link>
          </nav>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <div className="mb-10 border-b pb-8" style={{ borderColor: "var(--cream-border)" }}>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--crimson)" }}>
            {eyebrow}
          </p>
          <h1
            className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl"
            style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}
          >
            {title}
          </h1>
          <p className="mt-4 text-sm" style={{ color: "var(--ink-mid)" }}>
            Last updated: {updated}
          </p>
        </div>

        <div
          className="space-y-9 text-base leading-7"
          style={{ color: "var(--ink)" }}
        >
          {children}
        </div>
      </article>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2
        className="text-2xl font-semibold tracking-tight"
        style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}
      >
        {title}
      </h2>
      <div className="space-y-3 text-[15px] leading-7" style={{ color: "var(--ink-mid)" }}>
        {children}
      </div>
    </section>
  );
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>;
}
