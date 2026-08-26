import Image from "next/image";
import Link from "next/link";

const legalLinks = [
  { href: "/sms", label: "Harriett text messages" },
  { href: "/sms-terms", label: "SMS terms" },
  { href: "/privacy", label: "Privacy policy" },
];

export function PublicLegalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="legal-site-shell">
      <header className="legal-site-header">
        <Link href="/sms" className="legal-site-brand" aria-label="Harriett text message program">
          <span className="legal-site-portrait">
            <Image src="/harriett-logo.png" alt="" width={96} height={96} priority />
          </span>
          <span>
            <span className="brand-wordmark">Harriett<span className="text-crimson">.</span></span>
            <span className="legal-site-office">Pritchett-Moore Real Estate, LLC</span>
          </span>
        </Link>
        <nav className="legal-site-nav" aria-label="Legal and messaging pages">
          {legalLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>
      </header>
      <main id="main-content" className="legal-site-main">{children}</main>
      <footer className="legal-site-footer">
        <div>
          <strong>Pritchett-Moore Real Estate, LLC</strong>
          <address>1120 Queen City Avenue, Tuscaloosa, AL 35401</address>
          <a href="tel:+12053496535">205-349-6535</a>
          <span aria-hidden="true"> · </span>
          <a href="mailto:relocation@pritchett-moore.com">relocation@pritchett-moore.com</a>
        </div>
        <div className="legal-site-footer-links">
          {legalLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
          <Link href="/login">Agent sign in</Link>
        </div>
      </footer>
    </div>
  );
}
