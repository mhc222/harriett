import type { Metadata } from "next";
import Link from "next/link";
import { PublicLegalShell } from "@/components/public-legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy | Harriett",
  description: "Privacy policy for Harriett, Pritchett-Moore Real Estate's transaction assistant and agent messaging program.",
};

export default function PrivacyPage() {
  return (
    <PublicLegalShell>
      <article className="legal-document">
        <header>
          <p className="eyebrow">Effective August 25, 2026</p>
          <h1>Harriett Privacy Policy</h1>
          <p>This policy explains how Pritchett-Moore Real Estate, LLC handles information in Harriett, including the Harriett agent text message program.</p>
        </header>

        <section><h2>1. Information we collect</h2><p>Depending on how you use Harriett, we may collect:</p><ul><li>Account and office information, such as your name, office email, role, and authentication records.</li><li>Contact and messaging information, such as your mobile number, message content, delivery status, and attachments you send.</li><li>Consent records, including when and how you opted in or out, the disclosure provided, and evidence of your choice.</li><li>Transaction and work information you provide or that the office connects to Harriett, including deal documents, dates, contacts, calendar items, and task records.</li><li>Technical and security information, such as device, browser, IP address, login events, and audit records.</li></ul></section>

        <section><h2>2. How we use information</h2><p>We use information to operate and secure Harriett, authenticate users, assist with authorized real estate work, deliver requested messages and reminders, maintain consent and opt-out controls, improve reliability, investigate misuse, comply with law and office policy, and keep a complete audit trail of Harriett&apos;s actions.</p></section>

        <section className="legal-callout"><h2>3. Mobile information and messaging consent</h2><p><strong>Mobile phone numbers, text messaging originator opt-in data, and consent collected for Harriett are not shared with, sold to, rented to, or transferred to third parties or affiliates for their own marketing or promotional purposes.</strong></p><p>We use mobile information only to operate, support, secure, and comply with the Harriett messaging program. Vendors that process messaging or infrastructure data for us may handle it only to provide services on our behalf and under our instructions. They may not use Harriett mobile information or consent for their own marketing.</p><p>Message frequency varies based on transaction activity. Message and data rates may apply. See the <Link href="/sms-terms">Harriett SMS Terms</Link> for complete program details.</p></section>

        <section><h2>4. When information is disclosed</h2><p>We may disclose information to service providers that host, secure, analyze, or deliver Harriett on our behalf; to authorized Pritchett-Moore personnel who need it for office operations; when you direct or authorize a disclosure; or when required to protect rights, safety, security, or comply with legal process.</p><p>Harriett does not sell personal information. Harriett does not use mobile information or messaging consent for cross-context behavioral advertising or third-party lead generation.</p></section>

        <section><h2>5. Retention</h2><p>We retain information for as long as needed to provide Harriett, document consent, meet real estate recordkeeping and legal obligations, resolve disputes, enforce agreements, and maintain security and audit records. Retention periods vary by record type. Messaging providers and other service providers may maintain their own legally permitted operational records.</p></section>

        <section><h2>6. Security</h2><p>We use administrative, technical, and organizational safeguards designed to protect information, including access controls, encrypted connections, tenant-level database policies, webhook verification, consent checks before text delivery, and audit logging. No system can guarantee absolute security.</p></section>

        <section><h2>7. Your choices</h2><ul><li><strong>Text messages:</strong> Reply STOP or use any clear request to stop Harriett text messages. Reply HELP for assistance.</li><li><strong>Correction or access:</strong> Contact the office to request access to or correction of your account and contact information.</li><li><strong>Deletion:</strong> You may request deletion where applicable. Some records may be retained when required for legal, audit, security, or real estate recordkeeping purposes.</li></ul><p>See <Link href="/sms">Harriett text message enrollment</Link> for additional messaging choices.</p></section>

        <section><h2>8. Children&apos;s privacy</h2><p>Harriett is a business tool for authorized real estate professionals and staff. It is not directed to children under 13, and we do not knowingly collect personal information from children through Harriett.</p></section>

        <section><h2>9. Changes to this policy</h2><p>We may update this policy as Harriett or applicable requirements change. We will post the revised policy here and update the effective date. We will provide additional notice when required.</p></section>

        <section><h2>10. Contact</h2><address>Pritchett-Moore Real Estate, LLC<br />1120 Queen City Avenue<br />Tuscaloosa, AL 35401<br /><a href="tel:+12053496535">205-349-6535</a><br /><a href="mailto:relocation@pritchett-moore.com">relocation@pritchett-moore.com</a></address></section>
      </article>
    </PublicLegalShell>
  );
}
