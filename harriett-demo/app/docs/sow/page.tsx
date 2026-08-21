import { DocHeader, DocFooter } from "../DocShell";

export const metadata = {
  title: "Harriett Phase 2 Statement of Work | Pritchett-Moore Real Estate",
};

function Section({
  id,
  title,
  children,
  pageBreak = false,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
  pageBreak?: boolean;
}) {
  return (
    <section
      id={id}
      className={`mb-14 scroll-mt-8${pageBreak ? " print:break-before-page" : ""}`}
    >
      <h2 className="font-display text-xl font-bold text-teal mb-6 pb-3 border-b border-ink/10">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="font-display text-base font-semibold text-ink mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-teal/20 bg-teal/5 px-5 py-4 text-sm text-ink leading-relaxed">
      {children}
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gold/40 bg-gold/10 px-5 py-4 text-sm text-ink leading-relaxed">
      <span className="font-semibold text-ink">Critical path: </span>
      {children}
    </div>
  );
}

function LineItem({
  label,
  value,
  sub,
  bold,
}: {
  label: string;
  value: string;
  sub?: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 py-3 border-b border-ink/8 last:border-0 ${bold ? "font-semibold text-ink" : "text-stone"}`}
    >
      <div>
        <span className={bold ? "text-ink" : "text-ink/80"}>{label}</span>
        {sub && <p className="text-xs text-stone mt-0.5 font-normal">{sub}</p>}
      </div>
      <span className="shrink-0 tabular-nums">{value}</span>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm text-ink leading-relaxed">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
      <span>{children}</span>
    </li>
  );
}

function WeekRow({ weeks, label, note }: { weeks: string; label: string; note?: string }) {
  return (
    <tr className="border-b border-ink/8">
      <td className="py-3 pr-6 text-sm font-medium text-teal whitespace-nowrap">{weeks}</td>
      <td className="py-3 text-sm text-ink">{label}</td>
      {note && <td className="py-3 pl-6 text-xs text-stone">{note}</td>}
    </tr>
  );
}

export default function SowPage() {
  return (
    <div className="min-h-screen bg-white font-body text-ink">
      <DocHeader
        title="Phase 2 Statement of Work"
        subtitle="Harriett AI Transaction Assistant — Pilot and AI Enablement Kickstart"
        date="June 2026"
      />

      <main className="mx-auto max-w-3xl px-8 py-12">

        <Section id="parties" title="Parties">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-ink/10 bg-cream/50 p-5">
              <p className="text-xs font-medium uppercase tracking-widest text-teal mb-2">Client</p>
              <p className="font-semibold text-ink">Pritchett-Moore Real Estate, LLC</p>
              <p className="text-sm text-stone mt-1">Tuscaloosa, Alabama</p>
              <p className="text-sm text-stone">Wilson Moore, Broker of Record</p>
              <p className="text-sm text-stone">Tanner Ashcraft, Associate Broker</p>
            </div>
            <div className="rounded-lg border border-ink/10 bg-cream/50 p-5">
              <p className="text-xs font-medium uppercase tracking-widest text-teal mb-2">Vendor</p>
              <p className="font-semibold text-ink">Prairie Dog Labs</p>
              <p className="text-sm text-stone mt-1">matt@pdlabs.xyz</p>
              <p className="text-sm text-stone">pdlabs.xyz</p>
            </div>
          </div>
        </Section>

        <Section id="overview" title="Overview">
          <p className="text-sm text-ink leading-relaxed mb-4">
            Phase 2 moves Harriett from proof of concept to a live pilot with 2-3 opted-in
            agents at Pritchett-Moore Real Estate. This phase delivers a production-ready
            AI transaction assistant connected to the office&apos;s Microsoft 365 environment,
            capable of detecting new listings and contracts from agent inboxes and running
            three coordination workflows end-to-end.
          </p>
          <p className="text-sm text-ink leading-relaxed mb-6">
            Phase 2 also includes the AI Enablement Kickstart: custom Claude Projects for
            Wilson and Tanner, a 90-minute pilot agent training workshop, and a 15-prompt
            starter library so the team can get value from Claude immediately, independent
            of the Harriett build.
          </p>
          <Note>
            Phase 2 scope was expanded on June 8, 2026 to include pre-listing support
            (listing presentation prep, CMA draft assembly, voice-matched copy, MLS
            description drafting, and meeting listening). This addition is included in the
            fixed price below at no additional charge.
          </Note>
        </Section>

        <Section id="commercials" title="Commercials" pageBreak>
          <div className="rounded-lg border border-ink/10 divide-y divide-ink/8 mb-6">
            <LineItem
              label="Phase 2 fixed fee"
              value="$31,800"
              sub="All deliverables listed in this SOW. No hourly billing."
              bold
            />
            <LineItem
              label="Operating costs (post-launch)"
              value="$750 / month"
              sub="AI, SMS, and infrastructure. Billed monthly starting at pilot launch. ~$150-175/mo actual at 10 agents; $750 cap protects you from surprises."
            />
            <LineItem
              label="Optional retainer (month 4+)"
              value="$1,500 / month"
              sub="Priority support, monthly review calls, prompt updates, minor feature additions. Optional. Cancel anytime."
            />
          </div>

          <Sub title="Payment schedule">
            <div className="rounded-lg border border-ink/10 divide-y divide-ink/8">
              <LineItem
                label="On signing"
                value="$10,600"
                sub="33% deposit. Work begins immediately."
              />
              <LineItem
                label="M365 integration live + 3 workflows running"
                value="$10,600"
                sub="Weeks 8-10 milestone. Harriett is detecting contracts and running coordination."
              />
              <LineItem
                label="Pilot launch"
                value="$10,600"
                sub="Weeks 10-12. Pilot agents active, approval queue live, 30-day support window begins."
              />
            </div>
          </Sub>

          <div className="mt-4">
            <Note>
              Timeline is 12 weeks from the date this SOW is signed. Operating cost billing
              starts at pilot launch, not at signing.
            </Note>
          </div>
        </Section>

        <Section id="deliverables" title="Deliverables" pageBreak>

          <Sub title="1. Microsoft 365 Integration">
            <ul className="space-y-2 mb-4">
              <Bullet>OAuth app registration per opted-in pilot agent</Bullet>
              <Bullet>Read access to agent inbox via Microsoft Graph API</Bullet>
              <Bullet>Harriett detects new listing agreements and purchase contracts from Instanet notification emails</Bullet>
              <Bullet>Send-as capability: Harriett composes emails from the agent&apos;s Outlook account (agent reviews before send in Phase 2)</Bullet>
              <Bullet>Microsoft 365 admin contact required from client on Day 1</Bullet>
            </ul>
          </Sub>

          <Sub title="2. Three Live Coordination Workflows">
            <p className="text-sm text-stone mb-3">
              Harriett runs these end-to-end from deal detection through draft delivery to the agent.
            </p>
            <ul className="space-y-2">
              <Bullet>
                <strong>Marketing materials:</strong> Just Listed social post, Facebook copy, MLS
                remarks, postcard copy, and Instagram caption drafted from the listing agreement.
                Voice-matched to the agent.
              </Bullet>
              <Bullet>
                <strong>Photo coordination:</strong> Harriett identifies preferred photographer from
                the agent&apos;s vendor list, drafts outreach message, and requests scheduling.
                Agent approves before any send.
              </Bullet>
              <Bullet>
                <strong>Document drafting:</strong> Transaction coordinator checklist, seller net
                sheet, form flags (lead-based paint, FHA Amendatory Clause, agency disclosures),
                and closing estimate. Harriett flags missing forms before the file is submitted.
              </Bullet>
            </ul>
          </Sub>

          <Sub title="3. Pre-Listing Support (Agent-Initiated)">
            <p className="text-sm text-stone mb-3">
              Agent asks Harriett before the listing appointment. All output is agent-facing only,
              so no broker approval queue or A2P TCPA gates apply.
            </p>
            <ul className="space-y-2">
              <Bullet>Listing presentation prep: marketing flyer, self-promo sheet, neighborhood overview</Bullet>
              <Bullet>CMA draft: Harriett assembles comp data, flags outliers, sends a draft for the agent to review. Human must finalize pricing.</Bullet>
              <Bullet>Voice-matched copy: MLS description, social posts, and marketing copy in the agent&apos;s own voice, trained on writing samples</Bullet>
              <Bullet>Meeting listening: agent uploads a voice memo or Otter transcript, Harriett summarizes the seller conversation and produces follow-up tasks</Bullet>
            </ul>
          </Sub>

          <Sub title="4. Outbound Comms (SMS + Email)">
            <ul className="space-y-2">
              <Bullet>Production Twilio SMS via dedicated 10-digit long code (not sandbox)</Bullet>
              <Bullet>A2P 10DLC brand and campaign registration handled by Prairie Dog Labs on Day 1. Client provides legal name, EIN, and use-case description. Carrier approval typically takes 2-4 weeks.</Bullet>
              <Bullet>All consumer-facing messages pass through broker approval queue before send. No message reaches a consumer without Wilson or Tanner&apos;s review.</Bullet>
              <Bullet>Per-agent outbound settings: draft-only, review-before-send, or limited auto-acknowledgments (receipts and scheduling only)</Bullet>
            </ul>
          </Sub>

          <Sub title="5. Per-Agent Memory and Onboarding">
            <ul className="space-y-2">
              <Bullet>Per-agent onboarding flow: tone preferences, signoff, vendor relationships, writing samples</Bullet>
              <Bullet>Mem0 memory layer: Harriett remembers each agent&apos;s preferences, past vendor choices, and deal history across conversations</Bullet>
              <Bullet>Vendor list per agent: preferred inspector, photographer, title company, lender. Agent can update via chat or app.</Bullet>
            </ul>
          </Sub>

          <Sub title="6. Admin Dashboard">
            <ul className="space-y-2">
              <Bullet>Wilson and Tanner broker view: approval queue, deal pipeline, agent activity, compliance flags</Bullet>
              <Bullet>Coordinator view (Alyssa): deal checklist, pending tasks, file status</Bullet>
              <Bullet>Agent view: active deals, calendar, Harriett chat, vendor panel</Bullet>
              <Bullet>Available at meetharriett.xyz (already live from Phase 1)</Bullet>
            </ul>
          </Sub>

          <Sub title="7. AI Enablement Kickstart">
            <ul className="space-y-2">
              <Bullet>Custom Claude Project for Wilson Moore: office policy, approval rules, RECAD compliance context, Q&A assistant</Bullet>
              <Bullet>Custom Claude Project for Tanner Ashcraft: CMA analysis, listing strategy, client communication drafts</Bullet>
              <Bullet>90-minute pilot agent training workshop (on-site or Zoom): Harriett hands-on walkthrough, Claude Projects intro, Q&A</Bullet>
              <Bullet>15-prompt starter library: curated prompts for the 5 most common agent tasks (MLS copy, social posts, offer cover letters, seller updates, inspection summaries)</Bullet>
            </ul>
            <div className="mt-4">
              <Note>
                The Claude Projects and starter library are delivered in Weeks 2-3, before the production build is complete. This gives Wilson and Tanner immediate ROI while the technical work runs in parallel.
              </Note>
            </div>
          </Sub>

        </Section>

        <Section id="timeline" title="Timeline (12 Weeks)" pageBreak>
          <table className="w-full">
            <tbody>
              <WeekRow weeks="Weeks 1-2" label="Discovery locked, workflow mapping finalized, A2P 10DLC registration submitted, M365 admin access granted" />
              <WeekRow weeks="Weeks 2-3" label="Claude Projects delivered to Wilson and Tanner. Starter library delivered." note="Immediate value, independent of build timeline" />
              <WeekRow weeks="Weeks 3-6" label="M365 OAuth integration, inbox detection, deal write pipeline, agent onboarding flow" />
              <WeekRow weeks="Weeks 6-7" label="Pilot agent training workshop (on-site or Zoom)" />
              <WeekRow weeks="Weeks 6-10" label="Three workflows live: marketing materials, photo coordination, document drafting. Pre-listing support." />
              <WeekRow weeks="Weeks 10-12" label="Pilot launch with 2-3 opted-in agents. Broker approval queue active. Weekly reviews with Wilson and Tanner." />
              <WeekRow weeks="Post-launch" label="30 days included support: bug fixes, prompt tuning, agent questions" />
            </tbody>
          </table>
          <div className="mt-6">
            <Warning>
              A2P 10DLC registration must be submitted on Day 1 of Phase 2. Carrier approval
              takes 2-4 weeks and is on the carrier&apos;s timeline, not ours. If registration is
              delayed past Week 1, SMS capability will not be available at pilot launch.
              Harriett can operate in draft-only mode until approval clears.
            </Warning>
          </div>
        </Section>

        <Section id="client-responsibilities" title="Client Responsibilities">
          <p className="text-sm text-stone mb-4">
            Prairie Dog Labs handles all technical setup. Pritchett-Moore provides:
          </p>
          <ul className="space-y-2 mb-6">
            <Bullet>Names of 2-3 pilot agents who have opted in to the pilot</Bullet>
            <Bullet>Microsoft 365 admin contact for OAuth app approval (global admin consent required)</Bullet>
            <Bullet>Legal business name and EIN for A2P 10DLC registration</Bullet>
            <Bullet>Writing samples or past emails from each pilot agent for voice training</Bullet>
            <Bullet>Preferred vendor list per pilot agent (can be collected during onboarding session)</Bullet>
            <Bullet>Confirmation of dotloop migration timeline for Phase 3 sequencing</Bullet>
          </ul>
          <Note>
            None of the above requires significant time from Wilson or Tanner. The M365 admin
            contact is typically IT or the Office 365 account owner. The rest is collected in
            a 30-minute onboarding call per pilot agent.
          </Note>
        </Section>

        <Section id="out-of-scope" title="Out of Scope (Phase 3)">
          <p className="text-sm text-stone mb-4">
            The following are not included in Phase 2 but are planned for Phase 3:
          </p>
          <ul className="space-y-2">
            <Bullet>Dotloop API integration (triggers after office migration, planned EOY 2026)</Bullet>
            <Bullet>Twilio Voice for inbound agent calls (Deepgram STT + ElevenLabs TTS)</Bullet>
            <Bullet>Full office rollout beyond the pilot group</Bullet>
            <Bullet>Instanet replacement or data migration</Bullet>
          </ul>
        </Section>

        <Section id="signatures" title="Agreement" pageBreak>
          <p className="text-sm text-ink leading-relaxed mb-8">
            By signing below, Pritchett-Moore Real Estate, LLC and Prairie Dog Labs agree to
            the scope, commercials, timeline, and responsibilities described in this Statement
            of Work. Work begins on the date both parties have signed.
          </p>

          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-stone mb-6">Pritchett-Moore Real Estate, LLC</p>
              <div className="border-b border-ink/30 pb-1 mb-2 h-10" />
              <p className="text-sm text-ink font-medium">Wilson Moore</p>
              <p className="text-xs text-stone">Broker of Record</p>
              <div className="border-b border-ink/20 pb-1 mb-2 h-8 mt-6" />
              <p className="text-xs text-stone">Date</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-stone mb-6">Prairie Dog Labs</p>
              <div className="border-b border-ink/30 pb-1 mb-2 h-10" />
              <p className="text-sm text-ink font-medium">Matt Cronin</p>
              <p className="text-xs text-stone">Prairie Dog Labs</p>
              <div className="border-b border-ink/20 pb-1 mb-2 h-8 mt-6" />
              <p className="text-xs text-stone">Date</p>
            </div>
          </div>
        </Section>

      </main>
      <DocFooter />
    </div>
  );
}
