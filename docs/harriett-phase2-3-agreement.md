# AI Software Development and Services Agreement

**Harriett: Phase 2 + 3, Pilot Through Full Office Rollout**

This AI Software Development and Services Agreement (the "Agreement") is entered into as of [Effective.Date] (the "Effective Date") by and between:

- **Prairie Dog Labs** ("Developer"), contact matt@pdlabs.xyz; and
- **Pritchett-Moore Real Estate, LLC**, an Alabama limited liability company, Tuscaloosa, Alabama ("Client").

Developer and Client are each a "Party" and together the "Parties."

---

## 1. Background and Structure

Client has engaged Developer to build and deploy "Harriett," a custom AI transaction assistant for Client's real estate brokerage, and to deliver the related AI enablement services described in Schedule A (the "Statement of Work" or "SOW"). This Agreement sets the master terms. Schedule A sets the scope, deliverables, price, and timeline. If a term of Schedule A conflicts with the body of this Agreement, the body controls unless Schedule A expressly states that it overrides a specific section.

Client completed a prior proof-of-concept engagement ("Phase 1") for a fee of $7,200. That amount is credited in full against the fees under this Agreement, as reflected in Section 3.

---

## 2. Services and Deliverables

**2.1 Scope.** Developer will perform the services and provide the deliverables set out in Schedule A (collectively, the "Services" and "Deliverables").

**2.2 Client dependencies.** Client's timely cooperation is a condition of Developer's performance. Client will, without undue delay: provide Microsoft 365 administrative access for opted-in agents; designate an authorized point of contact; register and maintain the A2P 10DLC brand and campaign in Client's own business name and EIN (see Section 8); provide required content, credentials, vendor lists, and approvals; and make Wilson Moore or another authorized representative available for the approvals this Agreement requires. Developer is not responsible for delays caused by Client's failure to meet a dependency, and any resulting schedule slip extends Developer's deadlines day for day.

**2.3 Change orders.** Any change to the scope, Deliverables, price, or timeline, and any other modification to this Agreement, is effective only if made in a writing signed by both Parties (a "Change Order"). Electronic signature satisfies this requirement. Verbal agreements and email statements do not modify this Agreement.

**2.4 Dotloop deliverable.** The dotloop integration Deliverable depends on Client's own migration from its current document platform to dotloop, the timing of which is not fixed as of the Effective Date. Developer will deliver the dotloop integration when Client's migration occurs, at no additional fee, even if that migration completes after the build window in Schedule A. All other Deliverables are due on the Schedule A timeline regardless of dotloop timing.

**2.5 Acceptance.** Developer will notify Client when a Deliverable is ready. Client has ten (10) business days to test it against the description in Schedule A and to either accept it or give Developer a written list of specific, material failures to conform. Developer will correct conforming failures and resubmit. A Deliverable is deemed accepted on the earlier of Client's written acceptance, Client's first production use of it, or expiration of the ten (10) business day period without a written list of material failures.

---

## 3. Fees, Pass-Through Costs, and Payment

**3.1 Fixed fee.** The fixed fee for the Services and Deliverables is **$52,100**, calculated as a combined full price of $59,300 less the $7,200 Phase 1 credit.

**3.2 Payment schedule.** Client will pay the fixed fee in four (4) equal installments of **$13,025**:

| Payment | Amount | Due |
|---|---|---|
| 1 | $13,025 | At signing |
| 2 | $13,025 | Start of month 2 |
| 3 | $13,025 | Start of month 3 |
| 4 | $13,025 | Start of month 4 |

**3.3 Pass-through operating costs.** Third-party operating costs (large language model usage, hosting, and SMS/telephony charges) are estimated at approximately $750 per month once the system is live. These are billed to Client at cost, are outside the fixed fee, and begin when the pilot goes live. Developer does not mark these up and does not control third-party provider pricing. If a third-party provider changes its pricing, the pass-through amount changes accordingly.

**3.4 Optional retainer.** The AI Office Hours retainer described in Schedule A is optional, is $1,500 per month if elected, and may be cancelled by Client at any time on written notice. It is separate from the fixed fee.

**3.5 Late payment.** Undisputed amounts not paid within ten (10) days of the due date accrue interest at 1.5% per month or the maximum rate allowed by Alabama law, whichever is less. Developer may suspend Services on ten (10) days' written notice of a past-due undisputed amount that remains unpaid.

**3.6 Taxes.** Fees are exclusive of any applicable sales, use, or similar taxes, which are Client's responsibility, other than taxes on Developer's income.

---

## 4. Intellectual Property

**4.1 Definitions.**

- "Work Product" means the custom deliverables Developer creates specifically for Client under this Agreement, including the Harriett configuration, custom code written for Client, workflow specifications, custom prompts, and documentation, but excluding Background IP and Third-Party Materials.
- "Background IP" means anything Developer owned or developed outside this Agreement or independent of the Services, including Developer's pre-existing code libraries, frameworks, tools, templates, methodologies, and general know-how, and any improvements to them that are not specific to Client.
- "Third-Party Materials" means components Developer does not own, including open-source software and the AI models, platforms, and APIs of third-party providers (for example Anthropic, OpenAI, Microsoft, and Twilio), each governed by its own license or terms.
- "Client Data" means data Client or its agents provide or that the system processes on Client's behalf, including transaction records, contacts, and communications.

**4.2 Assignment of Work Product.** Effective upon Developer's receipt of the final payment under Section 3.2, Developer agrees to assign, and hereby does assign, to Client all right, title, and interest in and to the Work Product. Developer will execute documents reasonably necessary to perfect that assignment. Until final payment is received, Developer retains title to the Work Product and grants Client a limited license to use it for the purposes of this Agreement.

**4.3 Background IP.** Developer retains all right, title, and interest in its Background IP. To the extent Background IP is incorporated into or necessary to operate the Work Product, Developer grants Client a perpetual, non-exclusive, royalty-free, worldwide license to use that Background IP solely as part of, and to operate and maintain, the Work Product. Client may not separately commercialize, sublicense, or resell the Background IP apart from the Work Product.

**4.4 Third-Party Materials.** Third-Party Materials are licensed, not assigned. Client's use of them is subject to the applicable third-party terms, and Client is responsible for maintaining its own accounts and licenses with those providers where Schedule A so provides.

**4.5 AI layers.** For clarity, the ownership and license terms above allocate rights as follows: (a) the Work Product is assigned to Client under Section 4.2; (b) the underlying AI models and platforms are Third-Party Materials under Section 4.4; (c) as between the Parties, Client owns Client Data and the inputs and outputs specific to Client's use; and (d) neither Party acquires rights in the other's data for the purpose of training or fine-tuning AI models except as Section 6.3 allows.

**4.6 Client Data.** Client owns Client Data. Client grants Developer a limited license to access and process Client Data only as needed to perform the Services and operate the system.

---

## 5. AI-Specific Terms and Disclaimers

**5.1 Nature of AI output.** Harriett uses probabilistic AI models. AI-generated content (drafts, summaries, suggested messages, extracted data, and similar output) may contain errors or inaccuracies and is provided to assist, not replace, human judgment. Client is responsible for human review of AI output before it is relied on or sent, consistent with the broker approval process in Schedule A. Developer does not warrant that any specific AI output will be accurate, complete, or fit for a particular transaction.

**5.2 Human-in-the-loop.** Every consumer-facing message the system produces (text, email, or voice) is routed to Client's broker approval queue for review before it is sent. Developer will build and maintain that gate as described in Schedule A. Client is responsible for the operation of the approval queue and for the decisions its personnel make when approving, editing, or releasing messages.

**5.3 Third-party provider dependency.** The system depends on third-party AI, messaging, and platform providers that Developer does not control. Developer is not liable for a provider's outage, deprecation, rate limiting, pricing change, model change, or change to its terms of service. If a provider materially changes or discontinues a service, Developer will use commercially reasonable efforts to adapt the system, which may be handled as a Change Order.

**5.4 No legal, financial, or real estate advice.** Harriett and its output do not constitute legal, financial, tax, or licensed real estate advice. Compliance decisions, including agency disclosures and pricing advice, remain with Client and its licensed personnel.

---

## 6. Data, Privacy, and Confidentiality

**6.1 Confidentiality.** Each Party will protect the other's Confidential Information with at least reasonable care and will use it only to perform or receive the Services. "Confidential Information" includes Client Data, Developer's Background IP and methods, and the terms of this Agreement. This obligation survives termination for three (3) years, and for trade secrets for as long as they remain trade secrets.

**6.2 Data protection.** Developer will use commercially reasonable, industry-standard measures to protect Client Data. Client represents that it has all rights and consents needed for Developer to process Client Data and the data of Client's agents and their contacts as contemplated here, including any consent required for the messaging described in Section 8.

**6.3 No training on Client Data.** Developer will not use Client Data to train or fine-tune AI models except with Client's prior written approval. Developer will configure third-party AI providers to use non-training / no-retention settings where such settings are offered.

---

## 7. Representations and Warranties

**7.1 Mutual.** Each Party represents that it has the authority to enter into this Agreement and that its signatory is authorized to bind it.

**7.2 Developer.** Developer represents that: (a) the Services will be performed in a professional and workmanlike manner; (b) to Developer's knowledge, the Work Product as delivered will not knowingly misappropriate or infringe a third party's intellectual property rights, excluding Third-Party Materials and Client-directed materials; and (c) Developer holds the licenses it needs to use the Third-Party Materials it selects to build the Work Product. For a period of thirty (30) days after acceptance of a Deliverable, Developer will correct, at no charge, material defects that cause the Deliverable not to conform to Schedule A. This is Client's exclusive remedy for defective Deliverables.

**7.3 Client.** Client represents that: (a) it has the rights and consents described in Section 6.2; (b) it will operate the system in compliance with applicable law, including the compliance obligations in Section 8; and (c) content and instructions Client provides will not infringe third-party rights.

**7.4 Disclaimer.** Except as expressly stated in this Agreement, the Services, Deliverables, and any AI output are provided "as is." Developer disclaims all other warranties, express or implied, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement, and any warranty regarding the accuracy of AI-generated output.

---

## 8. Regulatory Compliance and Risk Allocation (SMS, A2P 10DLC, and AI Voice)

**8.1 Roles.** Developer builds the messaging and voice features, including the consent capture, opt-out handling (STOP/HELP), broker approval queue, AI voice disclosure, and audit trail described in Schedule A. Client operates the system and is the sender of record and the calling party for all outbound communications.

**8.2 A2P 10DLC.** The A2P 10DLC brand and campaign registration will be held in Client's own business name and EIN. Client is responsible for the accuracy of its registration and for maintaining it.

**8.3 Legal framework acknowledged.** The Parties acknowledge that outbound text and voice communications are regulated, including under the Telephone Consumer Protection Act (TCPA), and that the FCC's February 2024 Declaratory Ruling (FCC 24-17) treats AI-generated voices as "artificial or prerecorded voice" subject to TCPA consent and disclosure rules. Statutory damages under the TCPA are $500 to $1,500 per violating call or message with no aggregate cap. By design, the system performs no outbound voice to consumers; outbound voice is limited to vendors, with AI disclosure built in.

**8.4 Operational compliance is Client's responsibility.** As the sender and calling party, Client is responsible for operational compliance with the TCPA, applicable Do-Not-Call rules, A2P 10DLC requirements, and the FCC AI-voice-disclosure rules, including obtaining any required consent, honoring opt-outs, and reviewing and approving consumer-facing messages through the approval queue before they are sent. Developer's responsibility is limited to building the compliance features described in Schedule A so that they function as described.

**8.5 Cross-indemnities.** Each Party's indemnity obligations under Section 9 apply to compliance claims as allocated in this Section 8.

---

## 9. Indemnification

**9.1 By Developer.** Developer will defend and indemnify Client against third-party claims to the extent they arise from (a) Developer's breach of its warranty in Section 7.2(b) that the Work Product as delivered does not infringe third-party IP, or (b) Developer's gross negligence or willful misconduct.

**9.2 By Client.** Client will defend and indemnify Developer against third-party claims to the extent they arise from (a) Client's operation of the system, including any claim under the TCPA, Do-Not-Call rules, A2P 10DLC requirements, or FCC AI-voice rules that arises from messages or calls Client sent, approved, configured, or authorized; (b) Client Data or content and instructions Client provided; or (c) Client's breach of its representations in Section 7.3.

**9.3 Procedure.** The indemnified Party will give prompt written notice of a claim, allow the indemnifying Party to control the defense, and cooperate reasonably. The indemnifying Party will not settle a claim in a way that imposes a non-monetary obligation or admission on the indemnified Party without consent. Indemnity applies to a third-party claim covered by this Section whether or not the underlying liability is finally adjudicated, provided the settlement is reasonable and made with the indemnifying Party's involvement.

---

## 10. Limitation of Liability

**10.1 Cap.** Except for the Excluded Claims below, each Party's total aggregate liability arising out of or related to this Agreement will not exceed the total fees paid and payable to Developer under Section 3.2 (that is, $52,100).

**10.2 Consequential damages.** Except for the Excluded Claims, neither Party is liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits or lost revenue, even if advised of the possibility.

**10.3 Excluded Claims.** The cap in Section 10.1 and the waiver in Section 10.2 do not apply to: (a) a Party's indemnification obligations under Section 9; (b) Client's obligation to pay fees under Section 3; (c) breach of confidentiality under Section 6; or (d) a Party's fraud, gross negligence, or willful misconduct.

**10.4 Recovery limited to the business.** Client's recovery is limited to Prairie Dog Labs as a business entity. No individual owner, member, or employee of Developer has personal liability under this Agreement.

---

## 11. Term and Termination

**11.1 Term.** This Agreement begins on the Effective Date and continues until the Services are complete and all obligations are satisfied, unless terminated earlier.

**11.2 Termination for convenience by Client.** Client may terminate on fifteen (15) days' written notice. In that case Client pays for all Services performed and all installments that have come due through the effective date of termination, and Developer delivers the Work Product completed to that point. Amounts already paid are non-refundable to the extent Services were performed.

**11.3 Termination for cause.** Either Party may terminate if the other materially breaches and fails to cure within thirty (30) days of written notice, or immediately for non-payment that remains uncured after the notice in Section 3.5.

**11.4 Effect on IP.** If this Agreement is terminated before final payment, the assignment in Section 4.2 does not take effect for unpaid Work Product, but Client retains a license to use the Work Product for which it has paid. Upon full payment of amounts due through termination, the assignment applies to the Work Product delivered.

**11.5 Survival.** Sections 4, 5, 6, 7.4, 8, 9, 10, 11.4, 11.5, and 12 survive termination.

---

## 12. General

**12.1 Independent contractor.** Developer is an independent contractor, not an employee, partner, or joint venturer of Client. Neither Party may bind the other. Each Party is responsible for its own taxes and personnel.

**12.2 Governing law and venue.** This Agreement is governed by the laws of the State of Alabama, without regard to conflict-of-laws rules. The Parties consent to the exclusive jurisdiction and venue of the state and federal courts located in Tuscaloosa County, Alabama.

**12.3 Electronic signatures and consent.** The Parties agree to conduct this transaction by electronic means. Each Party consents to the use of electronic records and electronic signatures, including signature through PandaDoc. This Agreement may be signed electronically, and an electronic signature has the same legal effect as a handwritten signature under the Alabama Uniform Electronic Transactions Act (Ala. Code Sections 8-1A-1 to 8-1A-20) and the federal ESIGN Act (15 U.S.C. Section 7001). This Agreement may be signed in counterparts.

**12.4 Assignment.** Neither Party may assign this Agreement without the other's written consent, except that either Party may assign to a successor in a merger or sale of substantially all assets on written notice.

**12.5 Force majeure.** Neither Party is liable for delay or failure caused by events beyond its reasonable control, including third-party provider outages.

**12.6 Notices.** Notices must be in writing and sent to the contacts on the signature page, by email with confirmation or by recognized courier.

**12.7 Entire agreement.** This Agreement and Schedule A are the entire agreement between the Parties on this subject and supersede prior proposals and discussions, including the July 2, 2026 proposal to the extent it conflicts. If any provision is unenforceable, the rest remains in effect.

---

## Signatures

By signing below, each Party agrees to this Agreement as of the Effective Date and consents to sign electronically.

**Prairie Dog Labs (Developer)**

Signature: [[Developer.Signature]]

Name: Matt Cronin

Title: [Developer.Title]

Date: [[Developer.Date]]

Email: matt@pdlabs.xyz

<br>

**Pritchett-Moore Real Estate, LLC (Client)**

Signature: [[Client.Signature]]

Name: [[Client.Name]]

Title: [[Client.Title]]

Date: [[Client.Date]]

Email: [[Client.Email]]

---

## Schedule A: Statement of Work

### A.1 The technical build

- Microsoft 365 integration per opted-in agent (inbox, calendar, contacts)
- Per-agent training interface where each agent teaches Harriett their preferences, tone, and vendors
- Per-agent memory so Harriett remembers each agent's people and style across deals
- Five workflows live: marketing materials, photo coordination, document drafting, inspection coordination, closing coordination
- Text and email outbound through Twilio direct, with A2P 10DLC registration in Client's business name
- Broker approval queue on every consumer-facing message before it sends
- Lightweight CRM built in for agents without one
- Alabama-specific form awareness and RECAD-compliant message templates
- Consent capture and a complete audit trail
- Admin dashboard for Wilson and Tanner
- Inbound voice: a dedicated Harriett phone number agents can call to dictate deals, request help, or ask questions on the go
- Outbound voice to vendors only (inspectors, photographers, title companies), with AI disclosure built in; no outbound voice to consumers, by design
- Full office rollout beyond the original pilot group
- Dotloop integration for real-time, automatic deal detection (delivered per Section 2.4)

### A.2 The AI enablement bundle

- Custom Claude Projects for Wilson, configured with brokerage data, brand voice, recruiting templates, and financial workflows, with a 1-hour personal training session
- Custom Claude Projects for Tanner, the same approach, customized for his role
- Pilot agent AI training workshop: a 90-minute group session on prompt fundamentals and daily-use cases beyond Harriett
- Pilot agent starter prompt library: 15 pre-built prompts for listing descriptions, follow-ups, market analysis, and social posts
- AI Usage Policy and Compliance Framework: a written policy on responsible AI use, data privacy, and escalation paths
- Prompt library expanded office-wide: 30+ prompts for the full team
- Year 1 Quarterly Business Reviews: 4 sessions across the year to review metrics and identify new opportunities
- Agent AI Training Workshop Series: 4 workshops, about 60 minutes each, open to every opted-in agent

### A.3 In-person time

Two in-person trips, both absorbed into the fixed fee. One early in the engagement for discovery, Claude Project setup, and meeting the pilot agents in person. One at office-wide rollout for the launch kickoff, the first AI training workshop, and dotloop go-live.

### A.4 Timeline

| Month | What happens |
|---|---|
| 1 | Full office rollout begins; Custom Claude Projects setup for Wilson and Tanner; voice build starts |
| 2 | Voice live; inspection and closing workflows live; agent training workshops begin |
| 3 | Dotloop integration (if migration has occurred); continued office-wide onboarding |
| 4 | Full build complete; all five workflows live office-wide; AI enablement bundle delivered |

### A.5 Recurring costs (start once the pilot is live)

| Item | Cost |
|---|---|
| Operating costs (LLM, hosting, SMS), pass-through at cost | ~$750/month |
| AI Office Hours retainer (optional, cancel any time) | $1,500/month |
