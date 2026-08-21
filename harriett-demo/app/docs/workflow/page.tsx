import { DocHeader, DocFooter } from "../DocShell";

export const metadata = {
  title: "Harriett Workflow and System Map | Pritchett-Moore Real Estate",
};

function Section({ id, title, children, pageBreak = false }: { id?: string; title: string; children: React.ReactNode; pageBreak?: boolean }) {
  return (
    <section id={id} className={`mb-14 scroll-mt-8${pageBreak ? " print:break-before-page" : ""}`}>
      <h2 className="font-display text-xl font-bold text-teal mb-6 pb-3 border-b border-ink/10">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h3 className="font-display text-base font-semibold text-ink mb-4">{title}</h3>
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
      <span className="font-semibold text-ink">Important: </span>
      {children}
    </div>
  );
}

function Phase({ label }: { label: string }) {
  const colors: Record<string, string> = {
    "Phase 1": "bg-teal/10 text-teal",
    "Phase 2": "bg-gold/20 text-ink",
    "Phase 3": "bg-ink/8 text-stone",
    "Phase 1 (now)": "bg-teal/10 text-teal",
  };
  const cls = colors[label] ?? "bg-ink/8 text-stone";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

function WorkflowTable({ rows }: { rows: { step: string; today: string; withHarriett: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-ink/10 mb-6">
      <table className="w-full">
        <thead>
          <tr className="bg-cream border-b border-ink/10">
            <th className="py-3 px-4 text-left text-xs font-semibold text-stone uppercase tracking-wide w-1/4">Step</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-stone uppercase tracking-wide w-[37.5%]">Today</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-stone uppercase tracking-wide w-[37.5%]">With Harriett</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/6 bg-offwhite">
          {rows.map((r) => (
            <tr key={r.step} className="align-top">
              <td className="py-3 px-4 text-sm font-medium text-ink">{r.step}</td>
              <td className="py-3 px-4 text-sm text-stone">{r.today}</td>
              <td className="py-3 px-4 text-sm text-ink">{r.withHarriett}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-28 flex-shrink-0 font-medium text-stone">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

export default function WorkflowPage() {
  return (
    <div className="min-h-screen bg-paper print:bg-white">
      <DocHeader
        title="Workflow and System Map"
        subtitle="Every workflow Harriett handles, what accounts and integrations unlock each capability, and which phase each piece arrives. Use this as the reference for what to connect and when."
      />

      <main className="mx-auto max-w-4xl px-8 py-12 print:py-6">

        <Section id="live" title="What Is Live Today (Phase 1 Demo)">
          <p className="text-sm text-stone mb-6 leading-relaxed">
            The following capabilities are working right now, on your actual transaction data (604 2nd St NW, Gordo), without any additional accounts needing to be connected.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { title: "Contract reading and deal setup", body: "Upload a listing agreement or purchase contract as a PDF. Harriett reads it, extracts every material detail (parties, price, dates, loan type, compliance flags), writes the deal to the database, and generates the transaction checklist and calendar in one pass." },
              { title: "Transaction checklist", body: "Generated from every deal based on what is in the contract. Compliance items (lead paint, RECAD, FHA Amendatory Clause) are flagged automatically based on property age and loan type. Loads instantly on return visits." },
              { title: "Calendar events", body: "Listing date, closing date, inspection deadline (10 days before closing per Alabama buyer-beware rules), and lead paint disclosure window. Can be emailed as .ics invites to any address." },
              { title: "Marketing copy", body: "MLS remarks (800-character limit enforced), Facebook/Instagram post, and listing presentation talking points generated from contract data. No manual entry needed." },
              { title: "CMA slide builder", body: "Agent enters subject property and comparable sales. Harriett analyzes the comps, adjusts for differences, and produces a client-ready presentation with a suggested price range. All output is flagged as a draft for agent review." },
              { title: "Vendor outreach drafts", body: "Outreach emails to photographers, inspectors, title companies, appraisers, and deed prep vendors drafted with all deal context and proposed dates. Agent or coordinator reviews and sends." },
              { title: "Harriett chat", body: "The agent can ask Harriett anything about the active deal. She answers from contract data, her memory of office procedures, Alabama law, and the vendor list. Knows deadlines, compliance requirements, party names, and next steps." },
              { title: "Broker approval queue", body: "All Harriett-drafted messages queue for Wilson's review before anything is sent. Nothing goes out to anyone outside the office without a human sign-off." },
              { title: "WhatsApp (sandbox)", body: "During Phase 1, the agent can text Harriett directly on WhatsApp using the Twilio sandbox number, including sending contract PDFs by text. Demo channel only, not a production phone number." },
              { title: "Coordinator dashboard", body: "Active deal, checklist with completion status, calendar strip, approval queue, and deal activity. Designed for Alyssa and the coordinator role." },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-ink/10 bg-offwhite p-4">
                <p className="font-semibold text-sm text-ink mb-1">{item.title}</p>
                <p className="text-sm text-stone leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="pre-listing" title="Pre-Listing Workflows" pageBreak>
          <Note>
            These workflows happen before a listing agreement exists. They are agent-facing only.
            Because nothing touches a consumer at this stage, the broker approval queue, A2P 10DLC,
            and TCPA restrictions do not apply.
          </Note>
          <div className="mt-8 space-y-10">

            <Sub title="1. Listing Presentation Prep">
              <p className="text-sm text-stone mb-4 leading-relaxed">
                Harriett drafts a property-specific marketing flyer (or the content for one), writes listing presentation talking points, and compiles property highlights the agent can use in the seller appointment. Output is in the agent&apos;s own voice once per-agent memory is built in Phase 2.
              </p>
              <div className="space-y-2 text-sm">
                <MetaRow label="Phase 1 (now)" value="Working. Harriett generates presentation talking points from contract data or manually provided property details." />
                <MetaRow label="Phase 2" value="Voice-matched output using per-agent memory and writing samples." />
                <MetaRow label="Requires" value="Phase 1: nothing additional. Phase 2: per-agent onboarding (writing samples uploaded once)." />
                <MetaRow label="Manual step" value="The agent delivers the presentation. Harriett prepares the materials." />
              </div>
            </Sub>

            <Sub title="2. MLS Description Drafting">
              <p className="text-sm text-stone mb-4 leading-relaxed">
                Harriett writes the listing remarks for MLS entry. The 800-character hard limit is enforced automatically. Output respects the Alabama Tuscaloosa Association of REALTORS field format.
              </p>
              <div className="space-y-2 text-sm">
                <MetaRow label="Phase 1 (now)" value="Working. Harriett drafts MLS remarks as part of the marketing package immediately after a contract is uploaded." />
                <MetaRow label="Phase 2" value="Voice-matched to the individual agent." />
                <MetaRow label="Requires" value="Nothing additional. MLS submission is done by the coordinator; Harriett drafts the copy." />
                <MetaRow label="Manual step" value="Alyssa enters the copy into MLS. Harriett does not have MLS write access in Phase 1 or 2." />
              </div>
            </Sub>

            <Sub title="3. Social Media Content">
              <p className="text-sm text-stone mb-4 leading-relaxed">
                Harriett drafts a Facebook post and Instagram-ready caption for the listing. Includes property details, price, agent and brokerage attribution, and a call to action. Generated at the same time as the MLS remarks.
              </p>
              <div className="space-y-2 text-sm">
                <MetaRow label="Phase 1 (now)" value="Working. Harriett drafts the post. The agent copies and posts manually." />
                <MetaRow label="Phase 2 (optional)" value="Optional direct posting via Meta Pages API if the brokerage wants it. Draft workflow works today regardless." />
                <MetaRow label="Requires" value={<>Phase 1: nothing. Phase 2 (optional): Meta Business Account, Facebook Page admin access, Meta Pages API authorization. One-time setup.</>} />
                <MetaRow label="Manual step" value="The agent posts to their own social accounts. Direct posting via Meta API is optional." />
              </div>
            </Sub>

            <Sub title="4. CMA Draft Assembly">
              <p className="text-sm text-stone mb-4 leading-relaxed">
                Takes subject property details and comparable sales the agent enters, then produces a multi-slide CMA presentation: price range recommendation, per-square-foot analysis, comp adjustments, and positioning language for the listing appointment.
              </p>
              <div className="space-y-2 text-sm">
                <MetaRow label="Phase 1 (now)" value="Working. The agent enters comps manually. Harriett analyzes and builds the slides." />
                <MetaRow label="Phase 3+" value="Potential integration with MLS data feed. No clean public API exists today; comp data from MLS is inconsistent, so this will be assistive regardless of source." />
                <MetaRow label="Requires" value="Phase 1: nothing. Agent enters comps." />
                <MetaRow label="Manual step" value="The agent reviews, adjusts as needed, and presents the CMA to the seller." />
              </div>
              <div className="mt-4">
                <Note>
                  Harriett is never autonomous on pricing. Every CMA output is a draft for agent review and human judgment. The agent presents and defends the number. This is a hard rule, not a feature toggle.
                </Note>
              </div>
            </Sub>

            <Sub title="5. Seller Meeting Capture and Summarization">
              <p className="text-sm text-stone mb-4 leading-relaxed">
                Receives a recording or transcript from a seller meeting (voice memo, Otter export, or typed notes) and produces a summary, action items, and follow-up tasks. Feeds both the agent&apos;s to-do list and Harriett&apos;s memory for the deal.
              </p>
              <div className="space-y-2 text-sm">
                <MetaRow label="Phase 1 (now)" value="The agent can paste or type meeting notes; Harriett can summarize them in chat." />
                <MetaRow label="Phase 2" value="Structured intake for recordings or transcripts. Harriett turns them into formatted summaries and tasks." />
                <MetaRow label="Phase 3" value="Live phone or app-based voice capture via Twilio Voice plus Deepgram speech-to-text." />
                <MetaRow label="Manual step" value="Through Phase 2, the agent records the meeting with their own device and shares it." />
              </div>
            </Sub>
          </div>
        </Section>

        <Section id="post-signing" title="Post-Signing Workflows (The 5 Core Workflows)" pageBreak>
          <p className="text-sm text-stone mb-8 leading-relaxed">
            These workflows activate after a listing agreement or purchase contract is signed. Every consumer-facing message routes through the broker approval queue before it goes out.
          </p>

          <Sub title="1. Marketing Materials">
            <p className="text-sm text-stone mb-4 leading-relaxed">
              On a new listing, Harriett produces the full marketing package: MLS remarks, Facebook/Instagram post copy, Just Listed postcard copy, Agent News entry, and listing presentation talking points.
            </p>
            <WorkflowTable rows={[
              { step: "Just Listed postcard", today: "Alyssa sends via vendor", withHarriett: "Harriett drafts copy; Alyssa reviews and approves before send" },
              { step: "Social media post", today: "Agent writes or skips", withHarriett: "Harriett drafts Facebook/Instagram content, sends to agent for approval" },
              { step: "MLS remarks", today: "Vicki drafts via ChatGPT", withHarriett: "Harriett drafts in agent's voice, enforces 800-char MLS limit" },
              { step: "Listing presentation", today: "Agent assembles manually", withHarriett: "Harriett drafts property-specific flyer and supporting materials" },
              { step: "Agent News entry", today: "Alyssa adds manually", withHarriett: "Harriett drafts entry; Alyssa posts" },
            ]} />
            <div className="space-y-2 text-sm mt-4">
              <MetaRow label="Estimated savings" value="45 min/deal · $18,000/year at full office volume" />
              <MetaRow label="Phase 1 (now)" value="Working. All marketing copy generated on upload." />
              <MetaRow label="Phase 2" value="Voice-matched per agent. Optional: direct social posting via Meta API." />
              <MetaRow label="Manual step" value="Postcard printing/mailing via your vendor. MLS entry by Alyssa. Social posting is copy-paste unless Meta API option is enabled." />
            </div>
          </Sub>

          <Sub title="2. Photo Coordination">
            <p className="text-sm text-stone mb-4 leading-relaxed">
              Harriett drafts outreach to the photographer, tracks confirmation, and follows up if delivery is delayed.
            </p>
            <WorkflowTable rows={[
              { step: "Photographer booking", today: "Agent calls or emails preferred photographer", withHarriett: "Harriett drafts outreach with property address, proposed dates, agent contact" },
              { step: "Scheduling coordination", today: "Phone/email back-and-forth", withHarriett: "Harriett handles scheduling messages, surfaces confirmed time to agent" },
              { step: "Photo delivery follow-up", today: "Agent follows up manually", withHarriett: "Harriett monitors and follows up if delivery is delayed" },
              { step: "Upload to MLS", today: "Alyssa downloads and uploads manually", withHarriett: "Alyssa still uploads; Harriett confirms delivery and logs completion" },
            ]} />
            <div className="space-y-2 text-sm mt-4">
              <MetaRow label="Estimated savings" value="30 min/deal · $11,250/year at full office volume" />
              <MetaRow label="Phase 1 (now)" value="Harriett drafts the vendor outreach. Agent or coordinator sends manually." />
              <MetaRow label="Phase 2" value="Harriett sends directly, logs confirmation, tracks follow-up." />
              <MetaRow label="Requires (Phase 2)" value="Twilio SMS or Microsoft Graph for outreach sends. Optional: Cal.com booking pages per photographer." />
            </div>
          </Sub>

          <Sub title="3. Document Drafting">
            <p className="text-sm text-stone mb-4 leading-relaxed">
              Harriett flags required forms, auto-drafts the Net Sheet for every offer, and catches material mid-transaction changes like a loan type switch.
            </p>
            <WorkflowTable rows={[
              { step: "Net Sheet (Seller's Closing Estimate)", today: "Generated manually per offer", withHarriett: "Harriett auto-drafts from contract data for every offer amount" },
              { step: "Broker letter to seller", today: "Gail drafts and sends", withHarriett: "Harriett drafts; Gail or Wilson reviews and sends" },
              { step: "Compliance disclosure checklist", today: "Coordinator checks manually", withHarriett: "Harriett flags missing disclosures: RECAD, Lead-Based Paint, FHA addendum, Dual Agency" },
              { step: "FHA Amendatory Clause", today: "Agent handles if remembered", withHarriett: "Harriett flags automatically when loan type is FHA" },
              { step: "Lead-Based Paint disclosure", today: "Agent handles if remembered", withHarriett: "Harriett flags for any pre-1978 property, tracks 10-day inspection window" },
              { step: "Loan type change", today: "Agent may miss the compliance event", withHarriett: "Harriett flags FHA re-execution requirement if loan type changes mid-transaction" },
            ]} />
            <div className="space-y-2 text-sm mt-4">
              <MetaRow label="Estimated savings" value="45 min/deal · $14,062/year at full office volume" />
              <MetaRow label="Phase 1 (now)" value="Compliance flags, checklist, and form requirements generated automatically on upload." />
              <MetaRow label="Phase 3" value="dotloop integration for structured document management as the office migrates platforms." />
              <MetaRow label="Manual step" value="The agent still initials the checklist. Harriett generates it; compliance sign-off stays with the agent and broker." />
            </div>
          </Sub>

          <Sub title="4. Inspection Coordination">
            <p className="text-sm text-stone mb-4 leading-relaxed">
              Harriett drafts outreach to the inspector, tracks the 10-day lead paint window, flags earnest money timing, and reminds the agent of approaching deadlines. Alabama buyer-beware rules are built in: Harriett never generates seller-side inspection instructions.
            </p>
            <WorkflowTable rows={[
              { step: "Inspector booking", today: "Buyer arranges (Alabama buyer-beware rules)", withHarriett: "Harriett drafts outreach to inspector on agent's behalf, with available dates from vendor map" },
              { step: "Scheduling coordination", today: "Phone/email", withHarriett: "Harriett manages scheduling messages, confirms date with all parties" },
              { step: "Inspection reminder", today: "Agent follows up manually", withHarriett: "Harriett sends reminder to relevant parties 24-48 hours out" },
              { step: "Earnest money tracking", today: "Chanda holds check until agent confirms contract", withHarriett: "Harriett flags earnest money status in deal checklist; Chanda still handles deposit" },
              { step: "10-day window tracking", today: "Agent tracks in their head or calendar", withHarriett: "Harriett tracks deadline and surfaces it on the deal dashboard" },
            ]} />
            <div className="space-y-2 text-sm mt-4">
              <MetaRow label="Estimated savings" value="60 min/deal · $18,750/year at full office volume" />
              <MetaRow label="Phase 1 (now)" value="Harriett flags inspection deadlines and lead paint windows. Vendor outreach drafts are generated." />
              <MetaRow label="Phase 2" value="Outreach sends and confirmation tracking automated." />
              <MetaRow label="Manual step" value="The agent or buyer's agent arranges the inspection. Harriett coordinates the communication, not the physical inspection." />
            </div>
          </Sub>

          <Sub title="5. Closing Coordination">
            <p className="text-sm text-stone mb-4 leading-relaxed">
              Harriett handles title company outreach, closing reminders, HUD tracking, MLS status change flags, Just Sold copy, and commission notifications.
            </p>
            <WorkflowTable rows={[
              { step: "Title company coordination", today: "Agent emails/calls", withHarriett: "Harriett drafts outreach to title company, tracks confirmation" },
              { step: "Closing date reminders", today: "Agent tracks manually", withHarriett: "Harriett surfaces closing date countdown on dashboard and sends reminders" },
              { step: "HUD/settlement statement", today: "Agent receives, Alyssa loads into Instanet", withHarriett: "Harriett flags when HUD is expected; Alyssa still loads" },
              { step: "MLS status change", today: "Alyssa updates manually", withHarriett: "Harriett adds to coordinator task list with trigger date; Alyssa executes" },
              { step: "Just Sold postcard", today: "Alyssa sends", withHarriett: "Harriett drafts copy; Alyssa reviews and sends" },
              { step: "Commission notification", today: "Gail emails agent", withHarriett: "Harriett drafts notification; Gail or Wilson approves and sends" },
              { step: "Excel Master Sales list", today: "Coordinator emails Wilson/Gail every Monday", withHarriett: "Harriett generates weekly summary from deal data (Phase 2)" },
            ]} />
            <div className="space-y-2 text-sm mt-4">
              <MetaRow label="Estimated savings" value="90 min/deal · $28,125/year at full office volume" />
              <MetaRow label="Phase 1 (now)" value="Closing date tracked on calendar. Harriett knows North River Title (Brittany Newton, 205-345-5310) as Jerrod's preferred title company." />
              <MetaRow label="Phase 2" value="Full closing coordination: outreach sends, HUD tracking, MLS status change flag, post-close notifications." />
              <MetaRow label="Manual step" value="MLS status changes (Active to Pending, Pending to Sold) are performed by Alyssa. Harriett flags them and confirms they happened." />
            </div>
          </Sub>

          <div className="mt-8 rounded-lg border border-ink/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-teal text-offwhite">
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide">Workflow</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide">Per deal</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide">Annual value (full office)</th>
                </tr>
              </thead>
              <tbody className="bg-offwhite divide-y divide-ink/6">
                {[
                  ["Marketing materials", "45 min", "$18,000"],
                  ["Photo coordination", "30 min", "$11,250"],
                  ["Document drafting", "45 min", "$14,062"],
                  ["Inspection coordination", "60 min", "$18,750"],
                  ["Closing coordination", "90 min", "$28,125"],
                ].map(([wf, time, val]) => (
                  <tr key={wf}>
                    <td className="py-3 px-4 text-sm text-ink">{wf}</td>
                    <td className="py-3 px-4 text-sm text-stone">{time}</td>
                    <td className="py-3 px-4 text-sm text-stone">{val}</td>
                  </tr>
                ))}
                <tr className="bg-cream">
                  <td className="py-3 px-4 text-sm font-bold text-ink">Total</td>
                  <td className="py-3 px-4 text-sm font-bold text-ink">4.5 hours</td>
                  <td className="py-3 px-4 text-sm font-bold text-teal">$90,187/year</td>
                </tr>
              </tbody>
            </table>
            <p className="px-4 py-2 text-xs text-stone bg-cream/50 border-t border-ink/6">
              Based on approximately 50 deals per year at full office volume. Pre-listing time savings not yet quantified.
            </p>
          </div>
        </Section>

        <Section id="cross-cutting" title="Cross-Cutting Capabilities" pageBreak>
          <Sub title="Overwatch Layer">
            <p className="text-sm text-stone mb-4 leading-relaxed">
              Harriett monitors the full pipeline of active deals and flags: required forms that are missing or not yet signed, deadlines approaching or passed without confirmation, steps that appear stalled, and material compliance events (loan type change mid-transaction, pre-1978 property without lead paint disclosure recorded).
            </p>
            <div className="space-y-2 text-sm">
              <MetaRow label="Phase 1 (now)" value="Within a single deal, Harriett tracks overdue and upcoming checklist items. Chat surfaces these proactively." />
              <MetaRow label="Phase 2" value="Full multi-deal overwatch. Wilson and Tanner see a pipeline-level view. Harriett proactively alerts on anything stalled or at risk." />
              <MetaRow label="Requires" value="No additional integrations. The data is already in the platform." />
            </div>
          </Sub>

          <Sub title="Broker Approval Queue">
            <Note>
              This is a compliance control, not a feature option. Every message Harriett drafts for delivery to a consumer (buyer, seller, vendor, or third party) routes to Wilson&apos;s approval queue before it goes out. Wilson reviews, edits if needed, and approves. Nothing is sent automatically to anyone outside the office. There is no setting to bypass this for consumer-facing messages.
            </Note>
            <p className="mt-4 text-sm text-stone leading-relaxed">
              In Phase 1, the approval queue is visible in the dashboard. Approval logs every decision with a timestamp and the message text. For agent-facing outputs (checklist, CMA, marketing drafts), no approval step is required since the agent decides whether to use them.
            </p>
          </Sub>

          <Sub title="Audit Trail">
            <p className="text-sm text-stone leading-relaxed">
              Every Harriett action writes a record to the database: what was done, when, for which deal, and what was sent or generated. Covers contract uploads, checklist generation, marketing copy, vendor outreach drafts and sends, messages through the approval queue, calendar events created, and memory updates. Built from the beginning, no additional setup required. Basis for any future compliance reporting or dispute resolution.
            </p>
          </Sub>
        </Section>

        <Section id="integrations" title="Integration Dependency Map" pageBreak>
          <p className="text-sm text-stone mb-8 leading-relaxed">
            Every account or service connection required, organized by when it is needed. Already connected means it is in place now. Phase 2 connections need to be established at the start of Phase 2 work.
          </p>

          <Sub title="Already Connected (Phase 1)">
            <div className="overflow-x-auto rounded-lg border border-ink/10">
              <table className="w-full">
                <thead>
                  <tr className="bg-cream border-b border-ink/10">
                    <th className="py-3 px-4 text-left text-xs font-semibold text-stone uppercase tracking-wide">Service</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-stone uppercase tracking-wide">What it does for Harriett</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-stone uppercase tracking-wide">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-offwhite divide-y divide-ink/6">
                  {[
                    ["Supabase", "Database, file storage, authentication", "All deal data, checklist, calendar, messages, vendors"],
                    ["Anthropic (Claude AI)", "Reads contracts, generates copy, runs chat", "Primary AI brain; Sonnet 4.5 model"],
                    ["Mem0", "Per-agent memory across conversations", "Stores deal facts, preferences, office procedures"],
                    ["Postmark", "Sends calendar invites via email (.ics)", "harriett@meetharriett.xyz"],
                    ["Twilio (WhatsApp sandbox)", "Demo messaging channel", "Sandbox only; not a production phone number"],
                    ["Vercel", "Hosts the application", "meetharriett.xyz"],
                  ].map(([svc, what, notes]) => (
                    <tr key={svc}>
                      <td className="py-3 px-4 text-sm font-medium text-ink">{svc}</td>
                      <td className="py-3 px-4 text-sm text-stone">{what}</td>
                      <td className="py-3 px-4 text-sm text-stone">{notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Sub>

          <Sub title="Required for Phase 2 Launch">
            <div className="overflow-x-auto rounded-lg border border-ink/10 mb-4">
              <table className="w-full">
                <thead>
                  <tr className="bg-cream border-b border-ink/10">
                    {["Service", "What it enables", "Setup required", "Notes"].map((h) => (
                      <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-stone uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-offwhite divide-y divide-ink/6">
                  {[
                    ["Twilio (production SMS)", "Agent text channel; vendor outreach via text", "Twilio account upgrade; dedicated phone number purchase", "$1/month per number; ~$0.008/message"],
                    ["A2P 10DLC registration", "Legal requirement for business SMS in the US", "Brand + campaign registration through Twilio", "Submit Day 1 of Phase 2. Approval takes 2-4 weeks — on the critical path."],
                    ["Microsoft 365 OAuth (per opted-in agent)", "Email monitoring for new contracts; send email on behalf of the agent", "Admin consent grant from the M365 administrator; OAuth setup per agent", "One-time per agent; the agent keeps their own Outlook inbox"],
                    ["Microsoft Graph API", "Reads agent inbox for Instanet notification emails; sends email as the agent", "Requires M365 OAuth above", "Same credential; two uses"],
                  ].map(([svc, what, setup, notes]) => (
                    <tr key={svc}>
                      <td className="py-3 px-4 text-sm font-medium text-ink">{svc}</td>
                      <td className="py-3 px-4 text-sm text-stone">{what}</td>
                      <td className="py-3 px-4 text-sm text-stone">{setup}</td>
                      <td className="py-3 px-4 text-sm text-stone">{notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Warning>
              A2P 10DLC is the federal carrier registration required for any business sending text messages in the United States. It is not optional and cannot be retroactively applied. Registration must be submitted on Day 1 of Phase 2 because carrier approval takes 2 to 4 weeks. If this is not started immediately, text messaging will not be available at pilot launch. The brand and campaign registration are filed once and are not per-agent.
            </Warning>
          </Sub>

          <Sub title="Optional in Phase 2">
            <div className="overflow-x-auto rounded-lg border border-ink/10">
              <table className="w-full">
                <thead>
                  <tr className="bg-cream border-b border-ink/10">
                    {["Service", "What it enables", "Setup required"].map((h) => (
                      <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-stone uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-offwhite divide-y divide-ink/6">
                  {[
                    ["Meta Business Account + Pages API", "Direct posting from Harriett to the brokerage Facebook Page", "Meta Business Account, Page admin access, developer app with Pages API scope; one-time setup"],
                    ["Cal.com (per vendor)", "Self-scheduling links in vendor outreach emails", "Cal.com account per photographer or inspector; free tier available"],
                  ].map(([svc, what, setup]) => (
                    <tr key={svc}>
                      <td className="py-3 px-4 text-sm font-medium text-ink">{svc}</td>
                      <td className="py-3 px-4 text-sm text-stone">{what}</td>
                      <td className="py-3 px-4 text-sm text-stone">{setup}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Sub>

          <Sub title="Required for Phase 3">
            <div className="overflow-x-auto rounded-lg border border-ink/10 mb-4">
              <table className="w-full">
                <thead>
                  <tr className="bg-cream border-b border-ink/10">
                    {["Service", "What it enables", "Timing"].map((h) => (
                      <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-stone uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-offwhite divide-y divide-ink/6">
                  {[
                    ["dotloop API", "Structured deal detection from dotloop when the office migrates", "Office must complete dotloop migration first; planned later 2026"],
                    ["Twilio Voice", "Live voice calls (inbound from agents, outbound to vendors only)", "Phase 3; paired with Deepgram and ElevenLabs"],
                    ["Deepgram", "Speech-to-text for call transcription", "Phase 3; used with Twilio Voice"],
                    ["ElevenLabs", "Text-to-speech for Harriett's voice", "Phase 3"],
                  ].map(([svc, what, timing]) => (
                    <tr key={svc}>
                      <td className="py-3 px-4 text-sm font-medium text-ink">{svc}</td>
                      <td className="py-3 px-4 text-sm text-stone">{what}</td>
                      <td className="py-3 px-4 text-sm text-stone">{timing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Note>
              Harriett&apos;s voice capability in Phase 3 is agent-inbound and vendor-outbound only. Outbound voice to consumers (buyers or sellers) is not planned. This is a TCPA compliance boundary, not a technical limitation.
            </Note>
          </Sub>
        </Section>

        <Section id="matrix" title="Phase Summary by Capability">
          <div className="overflow-x-auto rounded-lg border border-ink/10">
            <table className="w-full">
              <thead>
                <tr className="bg-cream border-b border-ink/10">
                  {["Capability", "Phase 1 (now)", "Phase 2", "Phase 3"].map((h) => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-stone uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-offwhite divide-y divide-ink/6">
                {[
                  ["Contract PDF read and parse", "Live", "Live", "Live"],
                  ["Transaction checklist generation", "Live", "Live", "Live"],
                  ["Compliance flag detection", "Live", "Live", "Live"],
                  ["Calendar event generation", "Live", "Live", "Live"],
                  ["MLS remarks drafting", "Live", "Voice-matched", "Live"],
                  ["Social media post drafting", "Live (copy-paste)", "Optional: direct post", "Live"],
                  ["CMA slide builder", "Live (manual comps)", "Live", "Possible MLS data"],
                  ["Vendor outreach drafts", "Live", "Live + auto-send", "Live"],
                  ["Broker approval queue", "Live", "Live", "Live"],
                  ["Audit trail", "Live", "Live", "Live"],
                  ["Harriett chat (dashboard)", "Live", "Live", "Live"],
                  ["WhatsApp / SMS", "Demo sandbox", "Production SMS", "Production SMS"],
                  ["Agent email monitoring", "Not yet", "Live (Microsoft Graph)", "Live"],
                  ["Agent email sending", "Not yet", "Live (Microsoft Graph)", "Live"],
                  ["Multi-deal overwatch", "Single deal", "Full pipeline", "Full pipeline"],
                  ["Per-agent voice-matched copy", "Not yet", "Live", "Live"],
                  ["Seller meeting capture", "Manual/chat", "Structured upload", "Live voice capture"],
                  ["dotloop integration", "Not yet", "Not yet", "Live"],
                  ["Voice calls", "Not yet", "Not yet", "Live"],
                ].map(([cap, p1, p2, p3]) => (
                  <tr key={cap}>
                    <td className="py-3 px-4 text-sm text-ink">{cap}</td>
                    <td className="py-3 px-4 text-sm"><Phase label={p1} /></td>
                    <td className="py-3 px-4 text-sm text-stone">{p2}</td>
                    <td className="py-3 px-4 text-sm text-stone">{p3}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="action" title="What the Office Needs to Do Before Phase 2">
          <ol className="space-y-3">
            {[
              "Designate which 2 to 3 agents are in the pilot.",
              "Provide the Microsoft 365 admin contact so OAuth consent can be set up for those agents.",
              "Start A2P 10DLC registration on Day 1 of Phase 2. PD Labs handles the technical registration; the brokerage needs to provide legal business name, EIN, and use case description.",
              "Confirm the dotloop migration timeline so Phase 3 sequencing can be planned.",
            ].map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-stone">
                <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-teal text-offwhite text-xs font-bold">
                  {i + 1}
                </span>
                <span className="pt-0.5 leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        </Section>

      </main>

      <DocFooter />
    </div>
  );
}
