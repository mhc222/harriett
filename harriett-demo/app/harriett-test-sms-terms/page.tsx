import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "../components/LegalPage";

export const metadata: Metadata = {
  title: "Harriett Test SMS Terms",
  description: "Terms and conditions for Matthew Cronin's Harriett test SMS program.",
};

export default function HarriettTestSmsTermsPage() {
  return (
    <LegalPage
      eyebrow="SMS Terms"
      title="Harriett Test SMS Terms and Conditions"
      updated="August 25, 2026"
      privacyHref="/harriett-test-privacy"
      smsTermsHref="/harriett-test-sms-terms"
      smsEnrollmentHref="/harriett-test-sms"
    >
      <LegalSection title="Program Name">
        <p>Harriett Test SMS from Matthew Cronin.</p>
      </LegalSection>

      <LegalSection title="Program Description">
        <p>
          Harriett Test SMS sends low-volume test and development text messages from Matthew Cronin to opted-in internal testers.
        </p>
        <p>
          Messages may include product test notifications, demo workflow replies, transaction coordination test prompts, checklist reminders, and service updates. Messages are not sent to consumers or the public.
        </p>
      </LegalSection>

      <LegalSection title="Opt-In">
        <p>
          Internal testers opt in by visiting the public enrollment page at{" "}
          <Link href="/harriett-test-sms" className="font-medium underline">
            /harriett-test-sms
          </Link>{" "}
          and texting START to (205) 526-3026.
        </p>
        <p>
          The enrollment page explains that by texting START, a tester agrees to receive recurring automated, low-volume Harriett test and development SMS messages from Matthew Cronin. It also states that message frequency varies, message and data rates may apply, and testers may reply STOP to opt out or HELP for help.
        </p>
        <p>Opt-in is optional.</p>
      </LegalSection>

      <LegalSection title="Message Frequency and Charges">
        <LegalList>
          <li>Message frequency varies.</li>
          <li>Message and data rates may apply.</li>
          <li>Your mobile carrier may charge fees according to your wireless plan.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Opt-Out Instructions">
        <p>
          <strong>Text STOP to opt out.</strong> You may also opt out by texting QUIT, UNSUBSCRIBE, END, or asking Matthew Cronin to stop texting you.
        </p>
        <p>After opt-out, one confirmation message may be sent and then Harriett test SMS messages will stop.</p>
      </LegalSection>

      <LegalSection title="Help Instructions">
        <p>
          <strong>Text HELP for help.</strong> You may also contact{" "}
          <a href="mailto:matt@pdlabs.xyz" className="font-medium underline">
            matt@pdlabs.xyz
          </a>{" "}
          for support.
        </p>
      </LegalSection>

      <LegalSection title="Carrier Liability">
        <p>Carriers are not liable for any delayed or undelivered messages.</p>
      </LegalSection>

      <LegalSection title="Privacy">
        <p>
          Mobile information, text messaging originator opt-in data, and SMS consent are not shared with, sold to, rented to, or transferred to third parties or affiliates for marketing or promotional purposes.
        </p>
        <p>
          The Harriett Test SMS Privacy Policy is available at{" "}
          <Link href="/harriett-test-privacy" className="font-medium underline">
            /harriett-test-privacy
          </Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
