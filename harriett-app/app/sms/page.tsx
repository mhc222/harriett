import type { Metadata } from "next";
import Link from "next/link";
import { PublicLegalShell } from "@/components/public-legal-shell";

export const metadata: Metadata = {
  title: "Harriett Text Messages | Pritchett-Moore Real Estate",
  description: "Enrollment and consent details for Harriett informational text messages for Pritchett-Moore agents and staff.",
};

function displayPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return local.length === 10
    ? `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`
    : value;
}

export default function SmsProgramPage() {
  const smsNumber = process.env.TWILIO_FROM_NUMBER?.trim();
  const startHref = smsNumber ? `sms:${smsNumber}?body=START` : null;

  return (
    <PublicLegalShell>
      <section className="legal-hero">
        <p className="eyebrow">Agent enrollment</p>
        <h1>Harriett text messages</h1>
        <p className="legal-hero-lede">
          Harriett is Pritchett-Moore Real Estate&apos;s transaction assistant. This text
          program is only for Pritchett-Moore agents and staff. Harriett does not send
          text messages to buyers, sellers, leads, or other consumers.
        </p>
        <div className="legal-consent-card">
          <h2>Enroll your mobile number</h2>
          <p>
            By texting <strong>START</strong>, you agree to receive recurring automated
            informational SMS or RCS messages from Pritchett-Moore Real Estate, LLC through
            Harriett at the number you use. Messages may include new transaction alerts,
            compliance and deadline reminders, scheduling coordination, and replies to
            questions you send Harriett.
          </p>
          <p>
            Message frequency varies with your transaction activity. Message and data rates
            may apply. Reply <strong>HELP</strong> for help. Reply <strong>STOP</strong> at any
            time to opt out. Consent is not a condition of employment, affiliation, or any
            purchase of goods or services.
          </p>
          <p>
            By enrolling, you confirm that you are affiliated with Pritchett-Moore and control
            the mobile number you use. You also agree to the <Link href="/sms-terms">SMS Terms</Link>
            {" "}and acknowledge the <Link href="/privacy">Privacy Policy</Link>.
          </p>
          {startHref ? (
            <div className="legal-enrollment-action">
              <a className="primary-button" href={startHref}>Text START to enroll</a>
              <span>Send START to {displayPhone(smsNumber!)}</span>
            </div>
          ) : (
            <div className="legal-enrollment-action">
              <a className="secondary-button" href="tel:+12053496535">Call the office to enroll</a>
              <span>Ask for Harriett agent text enrollment.</span>
            </div>
          )}
        </div>
      </section>

      <section className="legal-section">
        <div><p className="eyebrow">Program details</p><h2>Useful updates, tied to your work</h2></div>
        <div className="legal-detail-grid">
          <article><h3>Who sends the messages</h3><p>Pritchett-Moore Real Estate, LLC sends messages through Harriett, its automated transaction assistant.</p></article>
          <article><h3>Who receives them</h3><p>Only affiliated agents and staff who have given specific consent for this program.</p></article>
          <article><h3>What they cover</h3><p>Transaction alerts, document and compliance items, deadlines, scheduling, and two-way assistance requested by the agent.</p></article>
          <article><h3>What they do not cover</h3><p>No consumer messaging, purchased lists, lead solicitation, third-party promotions, or unrelated marketing.</p></article>
        </div>
      </section>

      <section className="legal-section legal-section-bordered">
        <div><p className="eyebrow">What to expect</p><h2>Example messages</h2></div>
        <div className="message-example-list">
          <blockquote>Pritchett-Moore Real Estate: You&apos;re enrolled in Harriett agent text messages. Msg frequency varies. Msg &amp; data rates may apply. Reply HELP for help, STOP to opt out.</blockquote>
          <blockquote>Hi [Agent], it&apos;s Harriett. The inspection deadline for [Property] is Friday, and I have not seen the signed response. Want me to put together the next step?</blockquote>
          <blockquote>Hi [Agent], it&apos;s Harriett. The photographer has Tuesday at 10 a.m. or Wednesday at 2 p.m. open for [Property]. Which works for you?</blockquote>
        </div>
      </section>

      <section className="legal-section legal-section-bordered">
        <div><p className="eyebrow">Your choices</p><h2>Help, stopping, and re-enrollment</h2></div>
        <div className="legal-prose compact">
          <p><strong>For help:</strong> Reply HELP, call <a href="tel:+12053496535">205-349-6535</a>, or email <a href="mailto:relocation@pritchett-moore.com">relocation@pritchett-moore.com</a>.</p>
          <p><strong>To stop:</strong> Reply STOP, CANCEL, END, QUIT, REVOKE, or UNSUBSCRIBE. You may also use ordinary language, such as “stop texting me.” Harriett sends one confirmation and then stops.</p>
          <p><strong>To return:</strong> Text START from the same mobile number after reviewing this page. A fresh opt-in is required after any opt-out.</p>
        </div>
      </section>
    </PublicLegalShell>
  );
}
