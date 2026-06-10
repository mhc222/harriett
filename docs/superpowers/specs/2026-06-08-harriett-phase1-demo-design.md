# Harriett Phase 1 Demo — Design Spec

**Date:** 2026-06-08  
**Status:** Approved (approach A)  
**Goal:** Live web demo Wilson and Tanner can use during the Phase 1 presentation. Upload a listing agreement PDF, see Harriett parse it and produce real output. No SMS, email, voice, or app in scope.

---

## What we are building

A single-page Next.js 15 application deployed to Vercel. The client uploads a listing agreement PDF (or clicks "Demo Mode" to load a fictional Tuscaloosa, AL transaction). Harriett parses the document, displays extracted deal fields, then generates three outputs on demand: a transaction coordination checklist, an MLS listing description, and a listing presentation prep package. No database, no auth, no persistent state. The brain is the demo.

---

## Fictional transaction (Demo Mode)

Used when no PDF is uploaded. Based on a typical Tuscaloosa, AL residential deal.

- **Address:** 2847 Hargrove Rd, Tuscaloosa, AL 35401
- **Property type:** Single-family residential, 3 bed / 2 bath, 1,840 sq ft, built 1987
- **List price:** $274,900
- **Sellers:** John and Mary Caldwell
- **Listing agent:** Tanner Ashcraft, Pritchett-Moore Real Estate
- **Listing date:** June 15, 2026
- **Target close:** August 1, 2026
- **MLS:** Tuscaloosa Association of Realtors
- **Alabama flags:** buyer-beware (buyer arranges and pays for inspection), RECAD required, lead-based paint disclosure required (pre-1978 build year), no mandatory seller disclosure form

---

## Architecture

Stateless Next.js 15 App Router application. All processing happens in API routes. No Supabase for the demo. State lives in the browser session only.

```
app/
  page.tsx                    — single demo page
  api/
    parse/route.ts            — PDF → Claude → structured deal JSON
    checklist/route.ts        — deal JSON → transaction checklist
    marketing/route.ts        — deal JSON → MLS remarks + presentation prep
  components/
    UploadZone.tsx            — PDF drop/click upload + Demo Mode button
    DealSummary.tsx           — extracted fields, edit-in-place
    HarriettOutput.tsx        — three-tab panel (checklist, MLS, presentation)
    StreamingText.tsx         — animated text reveal for AI output
  lib/
    claude.ts                 — Anthropic SDK wrapper, streaming helpers
    demo-transaction.ts       — fictional Tuscaloosa transaction fixture
    prompts.ts                — all system/user prompts, separated from routes
```

**Dependencies:**
- `@anthropic-ai/sdk` — Claude Sonnet 4.5 calls
- `pdf-parse` — PDF text extraction server-side
- `tailwindcss` — styling (installed by create-next-app)

**Environment:**
- `ANTHROPIC_API_KEY` — `.env.local` locally, Vercel env var in prod

---

## API routes

### POST /api/parse

Input: `multipart/form-data` with `file` (PDF) or JSON `{ demoMode: true }`.

For PDF: extract text with `pdf-parse`, send to Claude with the Alabama listing agreement extraction prompt. Returns structured JSON:

```typescript
{
  address: string
  city: string
  state: "AL"
  zip: string
  listPrice: number
  sellers: string[]
  listingAgent: string
  brokerage: string
  listingDate: string      // ISO
  closingDate: string      // ISO
  propertyType: string
  bedBath: string
  sqft: number | null
  yearBuilt: number | null
  mlsNumber: string | null
  flags: {
    leadPaintDisclosure: boolean   // true if yearBuilt < 1978 or unknown
    recadRequired: true            // always true in Alabama
    buyerBeware: true              // always true in Alabama
    relocationCompany: boolean
  }
}
```

For demo mode: return the fictional transaction fixture directly (no Claude call needed).

### POST /api/checklist

Input: deal JSON from `/api/parse`.

Returns an ordered array of checklist items with Alabama-specific logic:

```typescript
{
  items: Array<{
    category: "pre-listing" | "listing-active" | "under-contract" | "closing"
    title: string
    detail: string
    daysFromListing?: number
    required: boolean
  }>
}
```

Alabama rules baked into the prompt: buyer arranges and pays for inspection, RECAD timing, lead paint addendum trigger, closing coordinator tasks.

### POST /api/marketing

Input: deal JSON from `/api/parse`.

Returns three outputs:

```typescript
{
  mlsRemarks: string          // ≤800 characters, MLS-compliant
  socialPost: string          // Facebook-style, warm and local
  presentationPoints: Array<{ heading: string; body: string }>
}
```

`presentationPoints` is the listing presentation prep: 4-6 key talking points (pricing rationale framing, marketing plan overview, what Pritchett-Moore brings, timeline). Uses professional persona by default (per-agent voice training is a Phase 2 feature).

---

## UI flow

1. **Landing state:** Harriett logo/wordmark, upload drop zone, "Try Demo Mode" button below it.
2. **Processing state:** spinner with "Harriett is reading the listing agreement..." text.
3. **Deal Summary:** extracted fields in a card layout. Edit-in-place (click any field to correct). "Looks right — let's go" button reveals the output panel.
4. **Harriett's Work panel:** three tabs. Each tab has a "Generate" button that streams the output. Streaming text animates in character by character. Copy-to-clipboard button on each output.
   - **Transaction Checklist** — grouped by phase, checkable items.
   - **MLS Remarks** — text area with character counter (800 limit highlighted).
   - **Listing Presentation** — cards for each talking point.
5. **Footer note:** "Harriett is an AI assistant. All output should be reviewed by the listing agent before use."

---

## Compliance notes (Phase 1 demo only)

- Outputs are agent-facing only; no consumer-facing content in this demo. Approval queue not required.
- "Reviewed before use" disclaimer on every output tab.
- No audit trail needed for the demo; full Supabase audit trail is a Phase 2 requirement.
- CMA prep: not included in this demo (no MLS data access). The presentation prep section shows the pattern (talking points, framing) without live comp data. Full CMA draft is Phase 2 with manual comp input.

---

## Out of scope (Phase 1 demo)

- SMS, email, voice, mobile app
- GoHighLevel integration
- Supabase / auth / multi-tenant
- ShowingTime entry
- Photo coordination
- Dotloop / Instanet integration
- Per-agent voice training (professional persona only)
- Live CMA with MLS comps

---

## Success criteria

Wilson uploads his own listing agreement (or clicks Demo Mode) and within 60 seconds sees: accurate parsed fields, a real Alabama transaction checklist, a usable MLS description, and a listing presentation prep summary. He can correct a parsed field and regenerate. The whole thing runs in the browser with no setup.
