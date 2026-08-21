# Harriett Client Progress Meeting

**Date:** August 17, 2026  
**Prepared for:** Wilson Moore and Tanner Ashcraft, Pritchett-Moore Real Estate, LLC  
**Prepared by:** Matt Cronin, Prairie Dog Labs

## Meeting outcome

By the end of this meeting, we should have:

1. A shared view of what Phase 1 proved and what has been built for Phase 2.
2. Agreement on the next pilot milestones and the people responsible for each dependency.
3. A clear path for West Alabama MLS access, without promising write access before WAMLS confirms it.
4. Agreement on the business questions that must be answered before forming a separate Harriett entity.

## Suggested 60-minute agenda

| Time | Topic | Outcome |
| --- | --- | --- |
| 0 to 5 minutes | Why we are here | Reconfirm the pilot goal and the office problems Harriett is solving |
| 5 to 20 minutes | Phase 1 walkthrough | Show the working proof of concept on a real Pritchett-Moore transaction |
| 20 to 35 minutes | Phase 2 progress | Show the production foundation, dashboard, security, compliance, and tests |
| 35 to 45 minutes | What comes next | Confirm the pilot order, integrations, and client inputs |
| 45 to 55 minutes | Harriett company and ownership | Agree on the questions for counsel and the intended commercial model |
| 55 to 60 minutes | Decisions and owners | Read back decisions, owners, and due dates |

## Opening talk track

> Phase 1 answered the first question: can Harriett understand a real Alabama transaction and turn it into useful work for the office? We proved that with contract extraction, Alabama-specific checklists and deadlines, marketing drafts, calendar events, deal chat, and vendor coordination drafts.
>
> We have now started the Phase 2 production rebuild. This is not just a prettier demo. The new system has real user roles, office-level data separation, secure document storage, a durable contract-processing workflow, a complete audit model, SMS consent and opt-out enforcement, and a production dashboard. The automated test suite, TypeScript checks, lint, and production build all pass.
>
> Today I want to show what is real, be precise about what is still being built, and leave with the decisions and information that unblock the pilot.

## What Phase 1 proved

The proof of concept demonstrated the complete core idea on a real Pritchett-Moore transaction:

- Upload a listing agreement or purchase contract.
- Extract parties, dates, prices, financing, property facts, and compliance flags.
- Generate the office checklist based on Pritchett-Moore's actual process.
- Track closing, lead-paint, inspection, and other transaction dates.
- Draft MLS remarks, social copy, listing presentation language, and vendor outreach.
- Let an agent or coordinator ask Harriett questions using the live deal context.
- Show the active deal, checklist, calendar, and proposed actions in a coordinator dashboard.
- Demonstrate WhatsApp as a temporary Phase 1 channel.

Phase 1 also gave us the real office knowledge needed for the production build: the roles of Wilson, Tanner, Alyssa, Gail, and Chanda; the office checklist; local vendors; Alabama RECAD and lead-paint considerations; and the way work currently moves through paper, email, Instanet, Excel, and MLS.

## What is built in the Phase 2 production app

| Area | Progress today | Why it matters |
| --- | --- | --- |
| Production app | New Next.js production application deployed at [harriett-app.vercel.app](https://harriett-app.vercel.app) | Phase 2 is being built separately from the demo |
| Identity and access | Login flow, invitations, agent roles, broker role, coordinator role | Each person gets the right view and permissions |
| Multi-office foundation | Every core record carries an office identity and Row Level Security policies | The system is designed for one office now and additional brokerages later |
| Deal data model | Deals, contacts, documents, vendors, calendar events, checklists, message threads, consent events, and audit records | Harriett has a structured operating system, not one large prompt |
| Document intake | Authenticated PDF upload and secure storage path | Contracts become first-class records with traceability |
| Durable contract processing | Trigger.dev task parses the PDF, creates the deal, builds dates, generates the checklist, and records every step | Long-running work can retry safely and does not disappear if a browser closes |
| Structured AI output | Zod-validated extraction and generation, with a primary model and fallback provider | Harriett does not rely on scraping unstructured model text |
| Date handling | Contract acceptance date is captured and used for deadline math | Compliance dates are anchored to the correct event |
| Audit trail | Append-only audit table and audit writes throughout the processing flow | Every Harriett action can be traced |
| SMS compliance | Twilio signature validation, agent consent checks, natural-language opt-out handling, STOP and HELP behavior, and content guardrails | Agent texting can launch inside the registered use case |
| Consumer protection | The database rejects consumer-facing SMS and requires broker approval metadata before consumer messages advance | Compliance is enforced in the system, not left to prompt instructions |
| Coordinator dashboard | Production dashboard skeleton reads live active deals and upcoming events | The clean coordinator experience is now taking shape |
| Deployment setup | Vercel project, Supabase schema and seed migrations, and Trigger.dev configuration are in place | The product can move through a controlled production deployment process |

### Verification completed August 17

- 34 automated tests passing across date logic, deal events, calendar output, and SMS compliance.
- TypeScript check passing.
- ESLint passing.
- Production build passing.
- Production Vercel deployment reports Ready.

## What is not complete yet

These items are part of the production roadmap and should not be presented as live today:

- Microsoft 365 connection for each pilot agent's inbox, calendar, and contacts.
- Public SMS opt-in page, privacy language, and approved A2P 10DLC campaign.
- Live production SMS/RCS number and agent enrollment.
- Full broker approval queue user interface and Trigger.dev waitpoint approval flow.
- Agent onboarding for preferred vendors, tone, signature, and working style.
- Self-hosted per-agent memory on Supabase pgvector.
- Full photo, inspection, closing, and document-drafting workflow automation.
- Meeting recording or dictated memo intake in the PWA.
- West Alabama MLS data feed.
- MLS listing create, edit, or status-change integration.
- Dotloop and voice, which belong to Phase 3.

## Recommended walkthrough order

### 1. Start with the office problem

Use the Gordo transaction as the story. Explain what normally requires people to read, rekey, remember, and chase. Keep the focus on reducing dropped steps and coordinator load.

### 2. Show the Phase 1 proof

Show contract upload, extracted deal data, compliance flags, checklist, marketing drafts, calendar, and Ask Harriett. Emphasize that the value is the connected workflow, not any single AI answer.

### 3. Show the production dashboard

Open [harriett-app.vercel.app](https://harriett-app.vercel.app). Explain that this is the clean Phase 2 rebuild with real authentication and a secure, multi-office data model.

### 4. Explain the invisible progress

The most important Phase 2 work is not all visible yet. Show or describe:

- The secure roles and office separation.
- The durable document workflow.
- The append-only audit trail.
- The broker approval rule.
- The SMS consent, opt-out, signature, and content controls.
- The passing automated tests and production build.

### 5. End with the next pilot experience

Describe the intended flow:

1. An opted-in agent forwards or uploads a contract.
2. Harriett extracts the transaction and starts the deal record.
3. Dates, checklist items, and compliance flags appear automatically.
4. The agent gets a concise text with the next action.
5. Alyssa sees the same deal and checklist on the dashboard.
6. Any consumer-facing email is drafted, reviewed by the broker, and sent from the agent's Microsoft 365 account.
7. Every action is recorded in the audit trail.

## West Alabama MLS plan

### What we can say with confidence

West Alabama MLS publicly lists **Matrix** as its MLS platform and **Trestle** for IDX and data feeds. WAMLS also publishes a technical support number at 205-345-7323 and a contact form. See the [WAMLS contact and support page](https://www.tuscaloosamls.com/contact-us).

NAR's current Brokerage Back Office policy expressly includes CRM and transaction-management uses. A participant can ask the MLS to send that feed to a designated vendor, but the MLS may require licenses, fees, security terms, and local-rule compliance. See [NAR Brokerage Back Office Feed Policy Statement 8.7](https://www.nar.realtor/handbook-on-multiple-listing-policy/participants-rights-section-20-brokerage-back-office-feed-policy-statement-8-7).

### The important distinction

- **Search and read:** likely available through a broker-authorized Trestle feed, subject to WAMLS approval and the exact licensed use.
- **Create, edit, and change status:** not confirmed. A RESO Web API feed does not automatically include write access. Add/Edit is a separate capability and can be implemented only for selected actions and fields. See the [RESO Web API Add/Edit specification](https://transport.reso.org/proposals/web-api-add-edit/).

### Recommended first implementation

1. Obtain a broker-sponsored Brokerage Back Office or other appropriate Trestle feed for private use by Pritchett-Moore agents and staff.
2. Use it for listing search, property context, comp discovery, and reducing rekeying where the license permits.
3. Let Harriett prepare a complete listing draft and validation checklist inside Harriett.
4. Keep final listing creation, edits, and status changes in Matrix until WAMLS and Trestle confirm a supported write path.

### Questions to send WAMLS and Trestle

> Pritchett-Moore is developing a private brokerage back-office and transaction-management assistant for its affiliated agents and staff. Prairie Dog Labs is the technology provider. We would like to understand the approved path for Pritchett-Moore to designate Prairie Dog Labs to receive a licensed WAMLS data feed through Trestle.
>
> 1. Which feed and license are appropriate for private brokerage CRM, transaction management, listing search, and comp discovery?
> 2. What fields, listing statuses, media, sold history, and roster data are included?
> 3. What are the application steps, fees, security requirements, and expected approval time?
> 4. Does WAMLS, Matrix, or Trestle provide an approved API for creating a listing, editing a listing, uploading media, or changing status?
> 5. If direct write access is not available, is there a supported deep link, single sign-on, or front-end-of-choice workflow for handing a prepared draft into Matrix?
> 6. What separate approval would be required when the product is later used by another WAMLS participant or by a brokerage in another MLS market?

## Separate Harriett company

### Working conclusion

Creating a separate software company does not, by itself, remove Pritchett-Moore's brokerage license, REALTOR membership, or MLS participation. Those rights and obligations remain with the qualified broker or brokerage participant. The software company does not inherit those rights. It acts as a technology vendor or participant designee under the applicable MLS data license. NAR describes MLS participation as belonging to qualifying brokers or firms, while vendors receive only the access authorized for a participant's licensed use. See [NAR's MLS participation guidance](https://www.nar.realtor/about-nar/policies/qualification-for-mls-participation-and-idx) and [NAR Policy Statement 8.6](https://www.nar.realtor/handbook-on-multiple-listing-policy/participants-rights-section-19-one-data-source-policy-statement-8-6).

This is a business and legal structuring decision. The meeting should agree on intent, then an Alabama business attorney and CPA should document it.

### Decisions needed before filing

1. Who are the members of the new company?
2. What percentage does each member own?
3. Who contributes cash, existing software, client knowledge, sales access, and future labor?
4. Who manages day-to-day operations, and which decisions require both sides?
5. Who owns the Harriett name, code, prompts, workflow designs, and future improvements?
6. What rights does Pritchett-Moore receive as the founding customer?
7. Can the new company sell to other brokerages, and are there territory, exclusivity, or preferred-pricing terms?
8. Who owns and controls customer data? The recommended rule is that each brokerage owns its data and the software company processes it only to provide the service.
9. What happens if a member stops working, wants to sell, dies, becomes disabled, or the parties disagree?
10. How are future funding, dilution, distributions, taxes, and a possible sale handled?

### Formation sequence after those decisions

If counsel and the parties choose an Alabama LLC:

1. Confirm the name and reserve it with the Alabama Secretary of State.
2. File the Certificate of Formation and appoint a registered agent.
3. Sign a custom operating agreement covering ownership, management, IP, commercialization, deadlock, transfer, and exit.
4. Obtain an EIN after the state entity exists. The IRS specifically recommends forming the state entity before applying for the EIN. See the [IRS EIN guidance](https://www.irs.gov/businesses/employer-identification-number).
5. Register the entity with My Alabama Taxes and confirm Business Privilege Tax obligations with the CPA. See [Alabama entity registration](https://www.revenue.alabama.gov/entity-registration/register-a-business/).
6. Open a bank account and bookkeeping system, and define approval rules for spending.
7. Put insurance in place, including technology errors and omissions and cyber coverage.
8. Sign the IP assignment or license, founding-customer agreement, data-processing terms, and any MLS vendor agreements.
9. Move the appropriate product contracts and accounts under the new entity only after the legal documents say who owns and controls them.

The Alabama Secretary of State states that a domestic entity requires a name reservation and Certificate of Formation. See the [Alabama domestic entity formation guide](https://www.sos.alabama.gov/sites/default/files/Business-Entities/Domestic%20Business%20Entities%20Brochure%202022.pdf).

## Decisions and inputs needed from Pritchett-Moore

### This week

- Confirm the first 3 to 5 pilot agents.
- Provide the brokerage's exact IRS legal name, EIN, and legal address for A2P registration.
- Confirm Wilson as the A2P authorized representative and approve the sample agent messages.
- Choose where the public SMS opt-in page and privacy policy will live.
- Identify the Microsoft 365 administrator and approve a meeting for Graph application consent.
- Authorize Matt to contact WAMLS and Trestle as Pritchett-Moore's proposed technology provider.
- Decide the intended Harriett company model: client-owned, Prairie Dog Labs-owned, or jointly owned.
- Select an Alabama business attorney and CPA for the entity and tax structure.

### From Matt

- Send the WAMLS and Trestle inquiry after written authorization.
- Publish the SMS opt-in and privacy pages after Wilson approves the language.
- Submit the Twilio A2P brand and campaign as soon as the required business information is complete.
- Schedule Microsoft 365 discovery with the office administrator.
- Invite the first pilot users and complete a secure end-to-end contract test.
- Deliver a short entity decision memo to counsel after the owners agree on the commercial intent.

## Next 30 days

| Window | Target |
| --- | --- |
| Days 1 to 3 | Confirm pilot agents, A2P details, M365 administrator, WAMLS authorization, and entity intent |
| Days 3 to 7 | Publish opt-in/privacy pages, submit A2P registration, send WAMLS/Trestle inquiry, and invite initial users |
| Week 2 | Connect Microsoft 365 test accounts, complete contract intake from upload and email, and put the approval queue UI in front of Wilson |
| Week 3 | Begin pilot-agent onboarding for tone, vendors, working style, and messaging consent |
| Week 4 | Run the first controlled pilot transaction end to end, review the audit trail, and measure time saved and missed-step reduction |

## Close the meeting with this read-back

> We have proven the concept and built the secure production foundation. The immediate critical path is not more AI work. It is getting the business and access pieces in place: pilot names, A2P business information, Microsoft 365 admin consent, WAMLS and Trestle authorization, and the intended ownership model for Harriett. I will send today's decisions with an owner and due date for each item, and I will keep MLS write access labeled unconfirmed until WAMLS approves a specific path.
