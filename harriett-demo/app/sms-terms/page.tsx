import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "../components/LegalPage";

export const metadata: Metadata = {
  title: "SMS Terms | Harriett",
  description: "Harriett SMS campaign terms and conditions for agent text notifications.",
};

export default function SmsTermsPage() {
  return (
    <LegalPage
      eyebrow="SMS Terms"
      title="Harriett SMS Campaign Terms and Conditions"
      updated="August 21, 2026"
    >
      <LegalSection title="Program Name">
        <p>
          Harriett SMS is the text messaging program for Harriett, the transaction assistant used by Pritchett-Moore Real Estate, LLC.
        </p>
      </LegalSection>

      <LegalSection title="Program Description">
        <p>
          Harriett SMS sends text messages to opted-in Pritchett-Moore Real Estate, LLC agents and staff. Messages may include new transaction alerts, deadline reminders, scheduling coordination, checklist updates, document follow-up, and replies to questions agents send to Harriett.
        </p>
        <p>
          Harriett SMS is for agents and staff only. Harriett does not send SMS messages to consumers.
        </p>
      </LegalSection>

      <LegalSection title="Opt-In">
        <p>
          You may opt in through an approved Harriett enrollment form, a recorded or documented verbal enrollment process, or another brokerage-approved consent flow. Opt-in is specific to Harriett SMS and is not a condition of your affiliation with Pritchett-Moore Real Estate, LLC.
        </p>
        <p>
          By opting in, you agree to receive recurring automated text messages from Harriett at the mobile number you provided.
        </p>
      </LegalSection>

      <LegalSection title="Message Frequency and Charges">
        <LegalList>
          <li>Message frequency varies based on transaction activity and your use of Harriett.</li>
          <li>Message and data rates may apply.</li>
          <li>Your mobile carrier may charge fees according to your wireless plan.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Opt-Out Instructions">
        <p>
          <strong>Text STOP to opt out.</strong> You may also opt out by texting QUIT, UNSUBSCRIBE, END, or by asking Harriett or the office to stop texting you.
        </p>
        <p>
          After you opt out, Harriett will send one confirmation message and then stop sending SMS messages to that number unless you re-enroll.
        </p>
      </LegalSection>

      <LegalSection title="Help Instructions">
        <p>
          <strong>Text HELP for help.</strong> You may also contact <a href="mailto:matt@pdlabs.xyz" className="font-medium underline">matt@pdlabs.xyz</a> or call the Pritchett-Moore Real Estate, LLC office for support.
        </p>
      </LegalSection>

      <LegalSection title="Carrier Liability">
        <p>
          Carriers are not liable for any delayed or undelivered messages.
        </p>
      </LegalSection>

      <LegalSection title="Privacy">
        <p>
          Mobile information, text messaging originator opt-in data, and SMS consent are not shared with, sold to, rented to, or transferred to third parties or affiliates for marketing or promotional purposes.
        </p>
        <p>
          The Harriett Privacy Policy is available at <Link href="/privacy" className="font-medium underline">/privacy</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Supported Carriers">
        <p>
          Message delivery depends on your mobile carrier and network availability. Wireless carriers are not responsible for Harriett SMS program content.
        </p>
      </LegalSection>

      <LegalSection title="Changes to These Terms">
        <p>
          These SMS terms may be updated from time to time. The updated version will be posted on this page with a new last updated date.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
