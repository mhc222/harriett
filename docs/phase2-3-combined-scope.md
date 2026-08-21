# Harriett: Combined Phase 2+3 Scope (Pilot Through Full Office Rollout)

Working draft. Merges the original Phase 2 ("The Pilot + AI Enablement Kickstart") and
Phase 3 ("Full Power + Office-Wide AI Enablement") from the May 28, 2026 proposal into a
single project scope and SOW, per Matt's 2026-06-30 decision to combine them. Source:
`~/Downloads/harriett_proposal_final.md`, reconciled against current locked architecture
in `CLAUDE.md`.

---

## Investment

| Item | Amount |
|---|---|
| Combined Phase 2+3 scope, sticker price | $59,300 |
| Phase 1 fee already paid, credited against this scope | -$7,200 |
| **Net due for Phase 2+3** | **$52,100** |
| **Total project cost, all phases (Phase 1 paid + net Phase 2+3)** | **$59,300** |

$66,500 was the old three-phase sticker total *before* the Phase 1 credit. Crediting the
$7,200 instead of charging it twice brings the real total project cost down to $59,300 —
that's the entire point of calling it a credit rather than just a relabeling.

**Timeline: 4 months build**, extended from the original 3-month estimate specifically to
absorb dotloop uncertainty (see Open Items #1) — the extra month gives room to land
dotloop integration inside the build window rather than treating it as a bolt-on later.

Recurring costs unchanged: $750/mo operating costs pass-through, optional $1,500/mo AI
Office Hours retainer, both starting once the pilot is live.

## Payment schedule

4 equal monthly payments of **$13,025** ($52,100 / 4), one per month of the 4-month build
— no separate holdback, payment cadence now tracks the build directly.

| Payment | Amount | Due |
|---|---|---|
| 1 | $13,025 | At signing (start of month 1) |
| 2 | $13,025 | Start of month 2 |
| 3 | $13,025 | Start of month 3 |
| 4 | $13,025 | Start of month 4 |
| — | — | End of month 4: build complete |

---

## Why combine

Originally Phase 3 was a separate decision the client made after watching Phase 2 run
live for 30+ days. Combining removes that second sales gate: one signature, one combined
build, the pilot-to-full-office expansion happens as a planned phase inside the same
engagement instead of a re-pitch. Tradeoff: less proof-of-traction leverage before asking
for the bigger number, and the dotloop dependency (below) doesn't go away just because
the paperwork merges.

---

## Combined technical build

Deduplicated and reconciled against current architecture. One change from the original
proposal text: Phase 2's text/email outbound was originally scoped through **GoHighLevel**.
Per `CLAUDE.md`, GHL was removed June 2026 — the locked architecture is **Twilio
Programmable Messaging, direct, with A2P 10DLC registered and owned by the brokerage**.
Any new SOW draft should describe outbound this way, not GHL.

**Core platform (from original Phase 2):**
- Microsoft 365 integration per opted-in agent (inbox, calendar, contacts)
- Per-agent training interface (preferences, tone, vendors)
- Per-agent memory across deals
- Three workflows live: marketing materials, photo coordination, document drafting
- Text and email outbound via Twilio direct, A2P 10DLC registration (brokerage-owned)
- Broker approval queue on every consumer-facing message
- Lightweight CRM for agents without one
- Alabama-specific form awareness, RECAD-compliant message templates
- Consent capture and full audit trail
- Admin dashboard for Wilson and Tanner
- Pilot cohort: 5 opted-in agents

**Scale-up build (from original Phase 3):**
- Inbound voice: dedicated Harriett phone number, agents call to dictate deals or ask questions
- Outbound voice to vendors only (inspectors, photographers, title companies), AI disclosure
  built in, no consumer outbound voice
- Full office rollout: onboarding for remaining agents beyond the pilot 5
- Dotloop integration: real-time automatic deal detection (delivered within the 4-month
  build if migration lands in time; otherwise delivered whenever migration happens — see
  Open Items #1)
- Inspection workflow: inspector, buyer's agent, seller, access logistics
- Closing workflow: title company, closing attorney, lender, buyer

## Combined AI Enablement bundle

- Custom Claude Projects for Wilson (brokerage data, brand voice, recruiting, financial
  workflows; 1-hour personal session)
- Custom Claude Projects for Tanner (same approach, his role)
- Pilot agent AI training workshop (90 min, prompt fundamentals + daily use)
- Pilot agent starter prompt library (15 prompts)
- AI Usage Policy and Compliance Framework (responsible use, data privacy, escalation —
  every brokerage needs this within 12 months for ARC compliance)
- Prompt library expanded office-wide (30+ prompts)
- Year 1 Quarterly Business Reviews (4 sessions, metrics + opportunities to leadership)
- Agent AI Training Workshop Series (4 sessions, ~60 min each, open to all opted-in agents)

## In-person time

Original proposal had two separate Huntsville trips (kickoff at Phase 2 start, launch at
Phase 3 start), both absorbed into their respective phase fees. Combining the phases
doesn't have to combine the trips — the kickoff trip still makes sense early (discovery,
Claude Project setup, meet the pilot agents) and the launch trip still makes sense at
office-wide rollout. Keep both trips, both still absorbed into the $52,100, since the
underlying work (two distinct moments in the engagement) hasn't gone away.

---

## Open items to resolve before this becomes a real SOW

1. ~~Dotloop timing is still unconfirmed~~ **Resolved 2026-07-02: build extended to 4
   months to absorb it, plus a standing commitment regardless of timing.** Per the
   2026-06-30 discovery call, both InstaNet and Dotloop have API access, and the
   migration date is still unknown. Rather than gate the SOW on the client's migration
   date, the build window grew from 3 to 4 months to make room for it, and Matt commits
   to delivering the dotloop integration whenever migration actually happens, even if
   that's after month 4 — it's not scoped strictly to the build window. Note for the SOW:
   *"If dotloop migration has not occurred by the end of the build, dotloop integration
   will still be provided once migration happens, at no additional cost."*
2. ~~30-day pilot proof window~~ **Resolved 2026-07-02: completed, not dropped.** Correction
   to the 2026-06-30 resolution below (which read this as the gate being cut) — Matt
   clarified the pilot validation step is **completed**, and the Phase 1 credit is applied
   on that basis. The 5-agent pilot has already satisfied its validation requirement, so
   full office rollout, voice, and the AI Enablement bundle proceed without restriction —
   not because the gate was waived, but because it was already met. The $7,200 Phase 1
   credit against Phase 2+3 (see Investment table above) stands as confirmed, not
   contingent on any further pilot proof.
3. **Retainer start date.** Original pricing has the $750/mo + optional $1,500/mo retainer
   starting "post Phase 2." With Phase 2 and 3 merged into a 4-month build, clarify whether
   that means after the pilot goes live (early in the build) or after the whole combined
   scope ships (end of month 4).
4. **GHL reference needs scrubbing.** Confirmed above — replace in any new proposal draft,
   the demo deck, and `docs/scope.md`'s Phase 2 description, which still says GHL.
