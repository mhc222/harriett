# Demo Update Brief

Context cleared after this was written. Pick up here next session.

## What the demo is

Live at harriett-demo.vercel.app. Repo: `/Users/mattcronin/Projects/Harriett/harriett-demo`.
Stack: Next.js 15 App Router, TypeScript, Tailwind, Claude Sonnet 4.5 via Anthropic SDK.

Three API routes:
- `POST /api/parse` — PDF upload or demoMode:true → returns DealFields JSON
- `POST /api/checklist` — DealFields → Alabama transaction checklist
- `POST /api/marketing` — DealFields → MLS remarks, Facebook post, listing presentation

UI flow: upload zone → parsing spinner → DealSummary (edit-in-place) → HarriettOutput (checklist tab + marketing tab).

## What needs to change

### 1. Swap demo fixture (required, quick)

File: `app/lib/demo-transaction.ts`

Replace fake 2847 Hargrove Rd with real closed transaction:

```ts
export const DEMO_TRANSACTION: DealFields = {
  address: "604 2nd St NW",
  city: "Gordo",
  state: "AL",
  zip: "35466",
  county: "Pickens",
  listPrice: 208000,
  salePrice: 208000,
  sellers: ["Amy Rohrer", "Larry K. Chung", "Xuan Vuong"],
  buyers: ["Shaina Fields", "Kevin Fields"],
  listingAgent: "Jerrod Hastings",
  brokerage: "Pritchett-Moore Real Estate",
  buyerAgent: "Damon Gann",
  buyerBrokerage: "KW Tuscaloosa",
  listingDate: "2025-11-16",
  closingDate: "2026-06-05",
  propertyType: "Single-family residential",
  bedBath: null,   // not in docs — leave null
  sqft: null,      // not in docs — leave null
  yearBuilt: null, // pre-1978 confirmed by lead paint form, exact year unknown
  mlsNumber: null,
  parcelId: "54110209300019002",
  subdivision: "Ridge Sub",
  loanType: "FHA",       // started USDA, converted to FHA 5/14/2026
  earnestMoney: 1000,
  sellerConcessions: 9700,
  appurtenances: ["refrigerator", "washer", "dryer"],
  flags: {
    leadPaintDisclosure: true,   // pre-1978, federal law triggered
    recadRequired: true,
    buyerBeware: true,
    relocationCompany: false,
    fhaLoan: true,               // triggers FHA Amendatory Clause
    loanTypeChanged: true,       // USDA → FHA mid-transaction
  },
};
```

### 2. Expand DealFields type (required to match fixture)

File: `app/lib/types.ts`

Add to the interface:
```ts
county: string | null;
salePrice: number | null;
buyers: string[];
buyerAgent: string | null;
buyerBrokerage: string | null;
parcelId: string | null;
subdivision: string | null;
loanType: string | null;
earnestMoney: number | null;
sellerConcessions: number | null;
appurtenances: string[];
flags: {
  leadPaintDisclosure: boolean;
  recadRequired: boolean;
  buyerBeware: boolean;
  relocationCompany: boolean;
  fhaLoan: boolean;         // add
  loanTypeChanged: boolean; // add — edge case worth showing
};
```

### 3. Update parse prompt (recommended)

File: `app/lib/prompts.ts` — PARSE_SYSTEM

Add to the extraction schema: county, salePrice, buyers, buyerAgent, buyerBrokerage,
parcelId, subdivision, loanType, earnestMoney, sellerConcessions, appurtenances.
Add to flags: fhaLoan, loanTypeChanged.

Update the Alabama rules section to note:
- Lead paint: 10-day inspection window must be tracked
- FHA Amendatory Clause required when loanType is FHA
- Seller concessions tracked separately from sale price

### 4. Update checklist prompt (recommended)

File: `app/lib/prompts.ts` — CHECKLIST_SYSTEM

Replace generic checklist instructions with PM's actual workflow steps:

**PM Listing checklist (agent must complete):**
- Listing Agreement signed
- Listing Estimated Net Sheet
- PM RECAD Disclosure
- State RECAD Notification
- Dual Agency Agreement (if applicable)
- Designated Single Agency (Wilson must approve)
- Lead-Based Paint Form (if pre-1978)
- PM Exclusive Listing Form
- Lockbox number, shackle code, CBS code collected

**New Listing (coordinator):**
- Verify folder complete (signed LA, photos, contact #s, lockbox/shackle/CBS codes)
- Photos uploaded to Alyssa's computer
- Listing entered in MLS with photos
- MLS link emailed to agent, cc Wilson and Gail
- Listing added to Agent News
- Logged in Excel Master Listings list
- Blue folder label made
- Just Listed postcard sent
- Broker letter to seller sent

**Pending Sale (coordinator):**
- Hold earnest money until agent confirms contract
- White label over blue on folder
- Logged in Excel Master Sales list
- MLS status: Active → Pending
- Earnest money to Chanda to deposit
- Final contract loaded into Instanet

**Closing:**
- Record closed date in Excel Master Sales list, email Wilson
- MLS status: Pending → Sold
- HUD/settlement loaded into Instanet
- Just Sold postcards sent
- Commission check notification to agent, copy Gail

**Alabama-specific flags to check:**
- Lead paint: 10-day inspection window from contract date
- FHA loan: FHA Amendatory Clause must be signed
- Loan type change mid-transaction: re-execute FHA Amendatory Clause
- RECAD signed before any substantive agency discussion
- Net Sheet required for every offer price (not just final)
- Designated Single Agency requires Wilson Moore approval

### 5. Update DealSummary component (nice-to-have)

File: `app/components/DealSummary.tsx`

Show buyers row (currently only shows sellers). Show county. Show earnest money and
seller concessions. Show loan type. Show lead paint flag more prominently if true.

### 6. Update parse route prompt hint (nice-to-have)

File: `app/api/parse/route.ts` line 35

Current text: "Extract the deal information from this listing agreement and return it as JSON."
Better: "Extract the deal information from this document. It may be a listing agreement,
purchase agreement, or closing disclosure. Return only JSON."

---

## Key people to know for prompts/copy

- Wilson Moore: President/Broker, approval authority
- Tanner Ashcraft: Associate Broker
- Alyssa: coordinator, manages photos and MLS
- Gail: executive admin, cc'd on most coordinator comms
- Chanda: handles earnest money deposits
- Jerrod Hastings: listing agent on demo transaction

## Vercel deploy

After changes: `cd harriett-demo && vercel --prod`
ANTHROPIC_API_KEY already set in Vercel env.

## Start order for next session

1. Update `types.ts` first (everything else depends on it)
2. Update `demo-transaction.ts`
3. Update `prompts.ts` (parse system + checklist system)
4. Update `DealSummary.tsx` to show buyers
5. Deploy and smoke test demo mode + PDF upload with the real Gordo docs
