import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "../components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Harriett",
  description: "Privacy policy for Harriett SMS and agent transaction assistant services.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy Policy"
      title="Harriett Privacy Policy"
      updated="August 21, 2026"
    >
      <LegalSection title="Who This Policy Covers">
        <p>
          This policy explains how Harriett handles information for Pritchett-Moore Real Estate, LLC agents and staff who use Harriett, including the Harriett SMS program.
        </p>
        <p>
          Harriett is built for brokerage operations and agent transaction coordination. Harriett SMS is for agents and staff only. Harriett does not send SMS messages to consumers.
        </p>
      </LegalSection>

      <LegalSection title="Information We Collect">
        <p>Depending on how you use Harriett, we may collect:</p>
        <LegalList>
          <li>Name, office affiliation, role, email address, and mobile phone number.</li>
          <li>SMS opt-in status, opt-out status, consent records, and message delivery records.</li>
          <li>Messages you send to Harriett and Harriett replies sent to you.</li>
          <li>Transaction coordination information, such as deal details, deadlines, checklist items, calendar events, documents, vendors, and notes.</li>
          <li>System logs and audit records needed to secure the service and document Harriett actions.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="How We Use Information">
        <p>We use information to:</p>
        <LegalList>
          <li>Provide Harriett transaction assistant services.</li>
          <li>Send agent SMS alerts, reminders, scheduling messages, and conversational replies when an agent has opted in.</li>
          <li>Maintain consent, opt-out, delivery, and audit records.</li>
          <li>Secure the service, troubleshoot issues, and prevent misuse.</li>
          <li>Support brokerage compliance, approvals, and transaction coordination workflows.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="SMS Privacy">
        <p>
          Mobile phone numbers and SMS opt-in consent collected for Harriett text notifications are used solely to deliver those notifications and operate the Harriett SMS program.
        </p>
        <p>
          Mobile information, text messaging originator opt-in data, and SMS consent are not shared with, sold to, rented to, or transferred to third parties or affiliates for marketing or promotional purposes. Text messaging opt-in data is not shared with third parties.
        </p>
        <p>
          Message frequency varies based on transaction activity. Message and data rates may apply. You can reply STOP at any time to opt out, or HELP for help. The Harriett SMS terms are available at <Link href="/sms-terms" className="font-medium underline">/sms-terms</Link>.
        </p>
      </LegalSection>

      <LegalSection title="When Information Is Shared">
        <p>
          Information may be shared only as needed to provide Harriett, operate brokerage workflows, comply with law, protect the service, or work with service providers who help deliver the system. Those providers may only use information to provide services to Harriett or Pritchett-Moore Real Estate, LLC.
        </p>
        <p>
          We do not sell personal information. We do not share SMS opt-in consent or mobile phone numbers for third-party marketing or promotional purposes.
        </p>
      </LegalSection>

      <LegalSection title="Opt-Out and Choices">
        <p>
          Agents may opt out of Harriett SMS messages at any time by replying STOP, QUIT, UNSUBSCRIBE, END, or by making a plain-language request to stop texting. After opt-out, Harriett will send one confirmation message and then stop SMS messages to that number unless the agent re-enrolls.
        </p>
        <p>
          Agents may also contact the office or email <a href="mailto:matt@pdlabs.xyz" className="font-medium underline">matt@pdlabs.xyz</a> for help with SMS enrollment, opt-out, or account questions.
        </p>
      </LegalSection>

      <LegalSection title="Data Retention">
        <p>
          Harriett keeps transaction, message, consent, and audit records for as long as reasonably needed to provide the service, meet brokerage requirements, resolve disputes, comply with law, and maintain security.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          Harriett uses technical and organizational safeguards designed to protect information from unauthorized access, loss, misuse, or disclosure. No system can guarantee absolute security, but access is limited based on role and operational need.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          For privacy questions or Harriett SMS support, contact <a href="mailto:matt@pdlabs.xyz" className="font-medium underline">matt@pdlabs.xyz</a> or Pritchett-Moore Real Estate, LLC.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
