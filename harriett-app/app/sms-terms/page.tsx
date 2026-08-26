import type { Metadata } from "next";
import Link from "next/link";
import { PublicLegalShell } from "@/components/public-legal-shell";

export const metadata: Metadata = {
  title: "SMS Terms | Harriett",
  description: "Terms for the Harriett agent text message program from Pritchett-Moore Real Estate, LLC.",
};

export default function SmsTermsPage() {
  return (
    <PublicLegalShell>
      <article className="legal-document">
        <header>
          <p className="eyebrow">Effective August 25, 2026</p>
          <h1>Harriett SMS Terms</h1>
          <p>These terms apply to the Harriett agent text message program operated by Pritchett-Moore Real Estate, LLC.</p>
        </header>

        <section><h2>1. Program description</h2><p>Harriett is Pritchett-Moore Real Estate&apos;s automated transaction assistant. The program sends informational SMS and RCS messages to enrolled Pritchett-Moore agents and staff. Messages may include transaction alerts, document and compliance items, deadline reminders, scheduling coordination, and replies to questions an enrolled recipient sends Harriett.</p><p>This program does not send text messages to consumers and is not used for third-party advertising or unrelated marketing.</p></section>

        <section><h2>2. Eligibility and consent</h2><p>You may enroll only if you are affiliated with Pritchett-Moore Real Estate and control the mobile number used to enroll. By texting START after reviewing the enrollment disclosure, or by giving documented verbal consent using the same disclosure, you consent to receive recurring automated informational messages from Pritchett-Moore through Harriett.</p><p>Consent is voluntary and is not a condition of employment, affiliation, or any purchase of goods or services. Consent applies only to this Harriett agent messaging program and may not be transferred to another person or program.</p></section>

        <section><h2>3. Message frequency and charges</h2><p>Message frequency varies based on your transaction activity and your conversations with Harriett. Message and data rates may apply under your wireless plan. Pritchett-Moore does not charge a separate fee for the program.</p></section>

        <section><h2>4. Opting out</h2><p><strong>Reply STOP at any time to unsubscribe.</strong> You may also reply CANCEL, END, QUIT, REVOKE, UNSUBSCRIBE, or use other clear language asking Harriett to stop. You will receive one confirmation of your opt-out. After that confirmation, no further Harriett text messages will be sent unless you provide fresh consent by texting START or completing another approved enrollment method.</p></section>

        <section><h2>5. Help and support</h2><p><strong>Reply HELP for help.</strong> You may also call Pritchett-Moore Real Estate at <a href="tel:+12053496535">205-349-6535</a> or email <a href="mailto:relocation@pritchett-moore.com">relocation@pritchett-moore.com</a>.</p></section>

        <section><h2>6. Delivery and availability</h2><p>Wireless carriers are not liable for delayed or undelivered messages. Delivery is subject to wireless service availability, carrier filtering, device compatibility, and other conditions outside Pritchett-Moore&apos;s control. Harriett text messages are an aid to your work and do not replace your responsibility to verify transaction documents, dates, legal requirements, or office instructions.</p></section>

        <section><h2>7. Privacy</h2><p>Our <Link href="/privacy">Privacy Policy</Link> explains how we collect, use, protect, and retain information connected with the program. Mobile information and text messaging opt-in data and consent are not shared with third parties or affiliates for their own marketing or promotional purposes.</p></section>

        <section><h2>8. Changes or termination</h2><p>Pritchett-Moore may change or discontinue the program. Material changes will be posted on this page with a revised effective date and, when appropriate, communicated through the program. A material change to the message subject matter will require new consent where required.</p></section>

        <section><h2>9. Contact</h2><address>Pritchett-Moore Real Estate, LLC<br />1120 Queen City Avenue<br />Tuscaloosa, AL 35401<br /><a href="tel:+12053496535">205-349-6535</a><br /><a href="mailto:relocation@pritchett-moore.com">relocation@pritchett-moore.com</a></address></section>
      </article>
    </PublicLegalShell>
  );
}
