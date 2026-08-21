# Harriett Client Meeting: Internal Notes

**Date:** August 17, 2026  
**Audience:** Matt only

## The story to tell

Lead with the outcome: Phase 1 proved the office workflow; Phase 2 is now a real production foundation. Do not spend the meeting narrating the technology stack. Translate each foundation item into its office value.

- RLS means each office and agent sees only the data they should.
- Trigger.dev means contract processing can finish and retry even if the browser closes.
- Structured outputs mean Harriett must return data that matches the contract, instead of hoping free-form text can be parsed.
- Audit rows mean every material action has a record.
- SMS rules mean opt-outs and campaign boundaries are enforced before a message sends.
- The dashboard means Alyssa and the brokers share one operational view.

## Do not overstate

- The current Phase 2 dashboard is a skeleton, not a completed coordinator product.
- The schema contains an approval queue and hard database constraints, but the complete broker review UI and durable waitpoint flow are not finished.
- The SMS compliance code is built and tested, but production texting is not authorized until the A2P brand and campaign are approved and agents enroll.
- Microsoft 365, self-hosted Mem0, agent onboarding, and the full workflows are not live.
- WAMLS read access appears practical through Trestle, but it still requires the correct broker-sponsored license.
- WAMLS listing creation and editing are unconfirmed. Do not say the RESO feed provides write access.
- The product is not ready for a five-agent pilot today. The production foundation is ready for the next integration and controlled test steps.

## Agreement issues to resolve before signature or entity formation

The current draft at `docs/harriett-phase2-3-agreement.md` should not be treated as final without addressing these items:

1. **IP and new company conflict.** Section 4.2 assigns all custom Work Product to Pritchett-Moore after final payment. A separately owned or jointly owned Harriett company cannot confidently commercialize the same code unless the agreement is revised or the new entity receives a clear assignment or license.
2. **Consumer channel wording.** Section 5.2 says every consumer-facing message, including text and voice, is approved. The architecture forbids consumer-facing SMS and outbound consumer voice entirely. The agreement should refer only to broker-approved consumer-facing email.
3. **Email provider wording.** Schedule A says text and email outbound through Twilio direct. Twilio is the agent SMS/RCS provider. Consumer-facing email is sent through Microsoft Graph from the agent's own address. Resend is for system email.
4. **Pilot versus full-office order.** The proposal and agreement move directly into full-office rollout in Month 1. The current decided plan is a 3 to 5 agent pilot, then measured expansion.
5. **Voice timing.** Voice and dotloop belong to Phase 3. They should not be implied as current Phase 2 deliverables.
6. **Operating-cost mismatch.** The agreement bills an estimated $750 per month in pass-through costs, while `docs/operating-costs.md` estimates roughly $150 to $175 per month for a ten-agent office before voice. Decide whether $750 is a budget cap, a prepaid allowance, or simply stale.
7. **Model and product names.** The operating-cost document contains stale model and image-provider names. Refresh pricing before attaching it to a contract.
8. **No personal-liability sentence.** Section 10.4 says recovery is limited to Prairie Dog Labs as a business entity. Confirm Prairie Dog Labs is the actual contracting legal entity and that its exact legal name is used throughout.

## LLC discussion guardrail

Do not file an LLC or promise an ownership split in the meeting. First settle:

- Who owns the product today under the Phase 1 and proposed Phase 2 agreements.
- Whether the new entity is owned by Matt, Pritchett-Moore, or both.
- Whether the brokerage contributes cash, domain expertise, a pilot site, customer references, or distribution rights in exchange for equity.
- Whether Matt's development labor is paid work, a capital contribution, or both.
- Whether Pritchett-Moore has exclusivity, a perpetual license, preferred pricing, or a board seat.
- Whether the Harriett entity can sell to direct competitors in the same market.
- Which party is responsible for MLS licenses, messaging registrations, Microsoft tenant approvals, and customer compliance.

Capture the business intent in plain English, then send it to Alabama counsel and a CPA. The operating agreement must be custom. A generic online template is not enough for a joint software company with contributed IP and a regulated customer.

## MLS research correction

The pasted research contains an obsolete Tampa/Stellar branch. Ignore it.

What is now supported by public sources:

- West Alabama MLS uses Matrix and lists Trestle for IDX and data feeds.
- A Brokerage Back Office feed is the best-fit category to ask about for a private CRM and transaction-management tool.
- Pritchett-Moore can request that a designated vendor receive the licensed feed on its behalf, subject to WAMLS terms.
- The new software company does not become an MLS participant merely because a broker owns part of it.
- Search/read and create/edit are separate capabilities.
- There is no public confirmation that WAMLS enables Property Add/Edit through Trestle or Matrix.

## Suggested decision log to fill in live

| Decision | Owner | Due date | Answer |
| --- | --- | --- | --- |
| First 3 to 5 pilot agents | Wilson and Tanner |  |  |
| A2P legal details provided | Wilson |  |  |
| Opt-in and privacy page location | Wilson |  |  |
| Microsoft 365 administrator | Tanner |  |  |
| Authorization to contact WAMLS/Trestle | Wilson |  |  |
| Intended Harriett ownership model | Matt, Wilson, Tanner |  |  |
| Business attorney | Client and Matt |  |  |
| CPA/tax adviser | Client and Matt |  |  |
| Agreement revision owner | Matt and counsel |  |  |
| Date for first controlled pilot transaction | Matt and Alyssa |  |  |

## Useful links in the room

- Production app: [harriett-app.vercel.app](https://harriett-app.vercel.app)
- Phase 1 demo: [harriett-demo.vercel.app](https://harriett-demo.vercel.app)
- A2P checklist: [a2p-10dlc-checklist.md](./a2p-10dlc-checklist.md)
- Workflow map: [workflow-system-map.md](./workflow-system-map.md)
- Phase 2 kickoff: [phase2-kickoff.md](./phase2-kickoff.md)
- Agreement draft: [harriett-phase2-3-agreement.md](./harriett-phase2-3-agreement.md)

## Verification record

Run from `harriett-app` on August 17, 2026:

- `npm test`: 4 files passed, 34 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- Vercel production deployment: Ready, with alias `harriett-app.vercel.app`.
