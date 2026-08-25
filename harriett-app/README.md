# Harriett

Harriett is Pritchett-Moore's AI operating assistant for agents, coordinators,
and brokers. The Next.js app is the shared dashboard and installable web client.
Its server APIs, Supabase records, Trigger.dev jobs, and messaging integrations
are client-independent so a native mobile app can use the same system later.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Property data

Harriett uses RentCast as the initial live read-only source for public listing
search, property lookup and preliminary valuation comps. Set `RENTCAST_API_KEY`
in `.env.local` and in the Vercel project environment. Never expose this key
through a `NEXT_PUBLIC_` variable.

The starter plan only includes 50 calls per month, so keep UI and AI prompts
tight: prefer one value/comps lookup for a known subject address over broad
exploratory searches. `RENTCAST_ENABLED=false` is available as an emergency
brake, but live builds should leave it true when the key is configured.

Authenticated property endpoints:

- `GET /api/properties/search?city=Tuscaloosa&state=AL&maxResults=10`
- `GET /api/properties/{rentcastListingId}`
- `GET /api/properties/value?address=123%20Main%20St%2C%20Tuscaloosa%2C%20AL%2035401`

Completed valuation and listing lookups are saved as immutable
`property_research_runs` with versioned artifacts. Harriett returns a dashboard
link using `NEXT_PUBLIC_APP_URL`, letting an agent move from chat into the full
research record without repeating the API call.

Search and valuation responses carry a notice that the public data must be
verified in the MLS. The integration caps a single search at 25 results and
validates RentCast responses before returning them to users or AI tools.

Property research uses Google Places API (New) for address autocomplete. Set
the server-only `GOOGLE_MAPS_API_KEY` in Vercel and `.env.local`, restrict the
key to Places API (New), and set a Google Cloud quota appropriate for the pilot.
Suggestions are biased toward Tuscaloosa and resolved to a complete formatted
address before RentCast runs. Autocomplete does not consume RentCast calls.

## Agent Messaging

Harriett uses Twilio Programmable Messaging for two-way agent messaging. SMS is
the production channel. WhatsApp sandbox is available as a temporary test
channel while SMS/RCS setup is pending. Incoming SMS and WhatsApp messages post
to `/api/webhooks/twilio`, are stored in Supabase, and trigger the durable
`process-agent-sms` task. Delivery updates post to `/api/webhooks/twilio/status`.

Set the Twilio variables from `.env.example` locally and in Vercel. Keep
`SMS_DELIVERY_MODE` disabled or dry-run while SMS registration is pending.
WhatsApp can be enabled separately with `WHATSAPP_DELIVERY_MODE=live` and
`TWILIO_WHATSAPP_FROM=whatsapp:+14155238886` for sandbox testing. The app still
requires a valid Twilio signature for inbound and delivery webhooks.

Trial accounts can send only to numbers verified in Twilio. Harriett does not
hardcode that test recipient. The sender is `TWILIO_FROM_NUMBER`, while each
recipient comes from the enrolled agent's `agents.phone` value in E.164 format.
For WhatsApp, Twilio uses the same phone value with the `whatsapp:` prefix.

Outbound WhatsApp messages may include HTTPS media URLs. The sender validates
the URLs and records every attachment in `message_attachments` for the audit
trail. Media must come from an approved public or signed URL and stay within
Twilio's file-size limits. Do not attach third-party property photos unless the
source license permits redistribution. Uploaded office assets, generated
graphics, and generated PDFs can use the same media path.

## Workspace

The authenticated workspace includes Today, Pipeline, Contacts, Research,
Approvals, Vendors, Knowledge, Writing, Connections, and Activity. Pages are
responsive for desktop and mobile. Production authentication uses invite-only
account setup followed by Supabase email and password login. Password recovery
uses a secure email link, and protected deep links preserve their destination
across login.

The database foundation includes properties, saved research, artifacts, work
items, external record links, provider sync runs, and message attachments. All
tables are tenant-scoped and protected by row-level security.

## AREC legal corpus

The focused AREC importer discovers individual Alabama real estate statutes and
rules by their `LawSectionID`, plus the statutory-changes page and its linked
PDFs. It does not crawl unrelated AREC pages. Add `FIRECRAWL_API_KEY` to
`.env.local`, apply migration `0023_knowledge_source_snapshots.sql`, then inspect
the extraction without database writes:

```bash
npm run knowledge:ingest:arec -- --dry-run --no-embeddings
```

The default import puts every discovered document in the knowledge review
queue. After broker or compliance review, current consolidated law records can
be initially published with `--publish-current`. Pending, future, form, act,
and guidance documents remain in review. Later content changes create an
immutable version and move an already published source back to review.

The importer refuses a corpus with fewer than 50 individual law records. The
`--allow-partial` and `--max-documents` options exist only for diagnostics.
For legacy ASP.NET sessions that Firecrawl cannot render, a browser export can
be piped into the same guarded importer with `--browser-snapshot-stdin`.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
