import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "../components/LegalPage";

export const metadata: Metadata = {
  title: "Harriett Test SMS Privacy Policy",
  description: "Privacy policy for Matthew Cronin's Harriett test SMS program.",
};

export default function HarriettTestPrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy Policy"
      title="Harriett Test SMS Privacy Policy"
      updated="August 24, 2026"
      privacyHref="/harriett-test-privacy"
      smsTermsHref="/harriett-test-sms-terms"
    >
      <LegalSection title="Who This Policy Covers">
        <p>
          This policy covers the Harriett test SMS program operated by Matthew Cronin for opted-in internal testers.
        </p>
        <p>
          Harriett test SMS messages are used for low-volume product testing and development. Messages are not sent to consumers or the public.
        </p>
      </LegalSection>

      <LegalSection title="Information Collected">
        <p>For the Harriett test SMS program, Matthew Cronin may collect:</p>
        <LegalList>
          <li>Name and mobile phone number.</li>
          <li>SMS opt-in status, opt-out status, consent records, and delivery records.</li>
          <li>Messages sent to and from Harriett during testing.</li>
          <li>Basic testing notes needed to operate and improve the Harriett demo workflow.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="How Information Is Used">
        <p>Information is used to:</p>
        <LegalList>
          <li>Send Harriett test and development SMS messages to opted-in testers.</li>
          <li>Respond to tester messages during development.</li>
          <li>Maintain consent, opt-out, delivery, and audit records.</li>
          <li>Troubleshoot and improve the Harriett test workflow.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="SMS Privacy">
        <p>
          Mobile phone numbers and SMS opt-in consent collected for Harriett test SMS messages are used only to operate the Harriett test SMS program.
        </p>
        <p>
          Mobile information, text messaging originator opt-in data, and SMS consent are not shared with, sold to, rented to, or transferred to third parties or affiliates for marketing or promotional purposes.
        </p>
        <p>
          Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. The Harriett Test SMS Terms are available at{" "}
          <Link href="/harriett-test-sms-terms" className="font-medium underline">
            /harriett-test-sms-terms
          </Link>.
        </p>
      </LegalSection>

      <LegalSection title="Opt-Out">
        <p>
          Testers may opt out at any time by replying STOP, QUIT, UNSUBSCRIBE, END, or by asking Matthew Cronin to stop sending text messages.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          For privacy questions or Harriett test SMS support, contact{" "}
          <a href="mailto:matt@pdlabs.xyz" className="font-medium underline">
            matt@pdlabs.xyz
          </a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
