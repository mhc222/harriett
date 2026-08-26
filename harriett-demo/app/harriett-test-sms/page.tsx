import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "../components/LegalPage";

const TEST_NUMBER_DISPLAY = "(205) 526-3026";
const TEST_NUMBER_E164 = "+12055263026";

export const metadata: Metadata = {
  title: "Harriett Test SMS Enrollment",
  description: "Public opt-in instructions for Matthew Cronin's internal Harriett test SMS program.",
};

export default function HarriettTestSmsPage() {
  return (
    <LegalPage
      eyebrow="Internal Test Program"
      title="Harriett Test SMS Enrollment"
      updated="August 25, 2026"
      privacyHref="/harriett-test-privacy"
      smsTermsHref="/harriett-test-sms-terms"
      smsEnrollmentHref="/harriett-test-sms"
    >
      <section className="rounded-xl border bg-white p-6 md:p-8" style={{ borderColor: "var(--cream-border)" }}>
        <h2 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
          Text START to enroll
        </h2>
        <div className="mt-4 space-y-4 text-[15px] leading-7" style={{ color: "var(--ink-mid)" }}>
          <p>
            By texting <strong>START</strong> to <strong>{TEST_NUMBER_DISPLAY}</strong>, you agree to receive recurring automated, low-volume Harriett test and development SMS messages from Matthew Cronin at the mobile number you use.
          </p>
          <p>
            Messages may include product test notifications, demo workflow replies, transaction coordination test prompts, checklist and deadline reminders, scheduling prompts, and service updates. This program is only for invited internal testers. Messages are not sent to consumers or the public.
          </p>
          <p>
            Message frequency varies. Message and data rates may apply. Reply <strong>HELP</strong> for help or <strong>STOP</strong> to opt out. Consent is optional and is not a condition of any purchase or service.
          </p>
          <p>
            By enrolling, you agree to the <Link href="/harriett-test-sms-terms" className="font-medium underline">Harriett Test SMS Terms</Link> and acknowledge the <Link href="/harriett-test-privacy" className="font-medium underline">Harriett Test SMS Privacy Policy</Link>.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href={`sms:${TEST_NUMBER_E164}?body=START`}
              className="inline-flex min-h-11 items-center justify-center rounded-lg px-5 py-3 font-semibold text-white"
              style={{ background: "var(--crimson)" }}
            >
              Text START to {TEST_NUMBER_DISPLAY}
            </a>
            <span className="text-sm">Use a mobile number you control.</span>
          </div>
        </div>
      </section>

      <LegalSection title="How Enrollment Works">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Review the disclosure above, the SMS terms, and the privacy policy.</li>
          <li>Click the enrollment button or send START to {TEST_NUMBER_DISPLAY}.</li>
          <li>Receive a confirmation identifying Matthew Cronin / Harriett Test as the sender.</li>
          <li>Reply STOP at any time to unsubscribe. Reply HELP for support.</li>
        </ol>
      </LegalSection>

      <LegalSection title="Example Messages">
        <div className="space-y-3">
          <blockquote className="rounded-lg border bg-white p-4" style={{ borderColor: "var(--cream-border)" }}>
            Matthew Cronin / Harriett Test: Your test checklist item “[task name]” is due on [MM/DD/YYYY]. Reply HELP for help or STOP to opt out.
          </blockquote>
          <blockquote className="rounded-lg border bg-white p-4" style={{ borderColor: "var(--cream-border)" }}>
            Matthew Cronin / Harriett Test: I received your test message about “[test workflow]” and saved it to the Harriett demo. Reply HELP for help or STOP to opt out.
          </blockquote>
          <blockquote className="rounded-lg border bg-white p-4" style={{ borderColor: "var(--cream-border)" }}>
            Matthew Cronin / Harriett Test: Reminder for [test property or deal]: [deadline type] is scheduled for [MM/DD/YYYY]. Reply HELP for help or STOP to opt out.
          </blockquote>
        </div>
      </LegalSection>

      <LegalSection title="Support and Opt-Out">
        <p>
          Reply HELP or email <a href="mailto:matt@pdlabs.xyz" className="font-medium underline">matt@pdlabs.xyz</a> for help. Reply STOP, CANCEL, END, QUIT, REVOKE, STOPALL, or UNSUBSCRIBE to opt out. A tester may also make a clear ordinary-language request to stop.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
