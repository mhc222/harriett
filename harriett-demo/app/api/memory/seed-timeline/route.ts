import { NextRequest, NextResponse } from "next/server";
import { addMemories } from "@/app/lib/mem0";

export const maxDuration = 60;

const USER_ID = "jerrod-hastings";

// Computed timeline for 604 Gordo + Alabama general timing rules
const TIMELINE_MEMORIES = [
  // ── GORDO DEAL COMPUTED TIMELINE ────────────────────────────────────────────
  {
    role: "user" as const,
    content: "What is the full timeline of key dates and deadlines for the 604 Gordo deal?",
  },
  {
    role: "assistant" as const,
    content: `604 2nd St NW, Gordo, AL — complete transaction timeline:

LISTING PHASE:
- Nov 16, 2025: Property listed
- Apr 30, 2026: Purchase contract signed (contract date / acceptance date)

PENDING PHASE (triggered Apr 30):
- Apr 30, 2026: MLS status changes Active → Pending (coordinator, same day)
- Apr 30, 2026: White label placed over blue on folder (coordinator)
- Apr 30, 2026: Earnest money ($1,000) held, confirm with Jerrod it is a contract
- Apr 30, 2026: Final contract loaded into Instanet (coordinator)
- May 4, 2026: Excel Master Sales list emailed to Wilson and Gail (next Monday)
- May 1–10, 2026: Lead-based paint 10-day inspection window (federal, pre-1978 property)
- May 14, 2026: Loan type changed USDA → FHA. FHA Amendatory Clause must be re-executed same day or immediately after.

CLOSING PHASE:
- Jun 3–4, 2026: Final walkthrough window (1–2 days before closing)
- Jun 5, 2026: Closing and disbursement. Cash to seller: $187,287.44.
- Jun 5, 2026: MLS status changes Pending → Sold (coordinator, same day)
- Jun 5, 2026: HUD/settlement statement loaded into Instanet (coordinator, same day)
- Jun 8–9, 2026: Just Sold postcards sent; email Jerrod confirmation (coordinator, within a few days of closing)
- Jun 8, 2026: Closed date recorded in Excel Master Sales list, email Wilson (next Monday)
- Jun 8, 2026: Commission check notification — Pritchett-Moore commission $4,160; email Jerrod when check is signed and ready, copy statement, scan to Gail`,
  },
  {
    role: "user" as const,
    content: "What lead paint deadlines applied to the Gordo deal and were they met?",
  },
  {
    role: "assistant" as const,
    content:
      "The 604 Gordo property is pre-1978, so federal law required Lead-Based Paint Disclosure. Contract signed April 30, 2026. The buyer had a 10-day inspection window: April 30 through May 10, 2026, to conduct a lead-based paint inspection or waive the right in writing. The closing disclosure confirms this form was executed. The closing date was June 5, 2026, well after the window closed, so the lead paint contingency period was complete before closing. Key compliance check: confirm the signed Lead-Based Paint Disclosure form is in the file.",
  },
  {
    role: "user" as const,
    content: "What are the FHA-specific timing requirements for the Gordo deal?",
  },
  {
    role: "assistant" as const,
    content:
      "The Gordo deal started as USDA financing and converted to FHA on May 14, 2026. This conversion is a material compliance event. Required by the conversion date: (1) FHA Amendatory Clause and Real Estate Certification must be re-executed — this form is required for all FHA transactions and must reflect the current loan type. (2) Appraisal must meet FHA minimum property standards. (3) Upfront MIP (mortgage insurance premium) of $3,512.60 was charged at closing. Confirm the FHA Amendatory Clause is signed and dated on or after May 14, 2026. Any clause signed before the conversion referencing USDA is not sufficient.",
  },

  // ── ALABAMA GENERAL TIMING RULES ────────────────────────────────────────────
  {
    role: "user" as const,
    content: "What are the standard timing rules for a pending sale in Alabama?",
  },
  {
    role: "assistant" as const,
    content: `Alabama pending sale standard timing checklist (days from contract date unless noted):

SAME DAY AS CONTRACT:
- MLS status: Active → Pending
- White label on folder (if PM listing, over blue)
- Earnest money held pending agent confirmation
- Final contract loaded into Instanet

WITHIN 5 DAYS:
- Loan pre-approval letter due (Alabama Purchase Agreement default if not specified)
- Confirm earnest money deposit with Chanda (if agent approves)
- Log in Excel Master Sales list

WITHIN 10 DAYS (from contract date):
- Lead-based paint inspection window closes (pre-1978 properties, federal requirement)
- Buyer must complete inspection or sign waiver

WITHIN 14–21 DAYS (typical, check contract):
- Inspection contingency deadline (Alabama buyer-beware: buyer arranges and pays)
- Buyer financing contingency exercise window (varies by contract terms)

WITHIN 21–30 DAYS (typical):
- Appraisal ordered and completed
- Loan commitment letter from lender

1–2 DAYS BEFORE CLOSING:
- Final walkthrough by buyers
- Title search confirmed clear
- Closing Disclosure provided to buyer (required 3 business days before closing under federal TRID rules)

CLOSING DAY:
- MLS status: Pending → Sold
- HUD/settlement statement loaded into Instanet
- Earnest money applied to closing costs

WITHIN DAYS OF CLOSING:
- Just Sold postcards sent; email agent confirmation, copy Gail
- Closed date recorded in Excel Master Sales list, email Wilson
- Commission check: email agent when ready, scan to Gail`,
  },
  {
    role: "user" as const,
    content: "What are the TRID timing rules for Alabama closings?",
  },
  {
    role: "assistant" as const,
    content:
      "Under federal TRID (TILA-RESPA Integrated Disclosure) rules, which apply to most residential mortgage transactions: the Loan Estimate must be provided within 3 business days of loan application. The Closing Disclosure must be provided to the buyer at least 3 business days before consummation (closing). If the CD is revised after delivery (e.g., due to loan type change like USDA to FHA), a new 3-business-day waiting period may restart. The Gordo deal's loan type change on May 14, 2026 likely triggered a new Closing Disclosure, resetting the 3-day clock from that date. Cash transactions are exempt from TRID but still require a settlement statement.",
  },
  {
    role: "user" as const,
    content: "What happens to earnest money timing in Alabama?",
  },
  {
    role: "assistant" as const,
    content:
      "Alabama earnest money rules: the broker holds the earnest money check until the agent confirms it is a contract (not just an offer). Once confirmed, take the check to Chanda to deposit — but only with the agent's approval. The earnest money cannot be released unilaterally by the broker; both parties must agree in writing, or the broker must interplead to court. If the buyer fails to perform, the seller may elect to keep the earnest money as liquidated damages. If the seller fails to perform, the earnest money is returned to the buyer. In the Gordo deal: $1,000 earnest money was held with KW Tuscaloosa (buyer's broker) per the ALTA settlement statement. Timeline: confirmed as contract April 30, 2026; applied to buyer's closing costs at closing June 5, 2026.",
  },
  {
    role: "user" as const,
    content: "When must Excel Master list updates go to Wilson and Gail?",
  },
  {
    role: "assistant" as const,
    content:
      "Pritchett-Moore Excel Master lists are emailed to Wilson Moore and Gail every Monday. Two separate lists: (1) Excel Master Listings list — updated when new listings come in and when listings go pending. (2) Excel Master Sales list — updated when contracts are signed (pending date, closing date, agent, property type, concessions) and when deals close (closed date recorded, email Wilson). For the Gordo deal: contract signed April 30, 2026 (Thursday) → Sales list updated Monday May 4. Closed June 5, 2026 (Friday) → closed date recorded and emailed to Wilson Monday June 8. These Monday reports are the office's substitute CRM for now.",
  },
  {
    role: "user" as const,
    content: "What are the new listing coordinator timing requirements?",
  },
  {
    role: "assistant" as const,
    content: `New listing coordinator timing (Pritchett-Moore standard):

SAME DAY or AS SOON AS POSSIBLE:
- Verify folder is complete (listing agreement, forms, photos, contact numbers, lockbox/shackle/CBS codes). If anything is missing, email agent immediately — do not wait.
- Receive photos from agent; upload to Alyssa's computer
- Enter listing in MLS with photos; convert from provisional to active if needed
- Email MLS link to listing agent, copy Wilson and Gail
- Put listing in Agent News (internal office bulletin)
- Log in Excel Master Listings list (emailed Wilson and Gail next Monday)
- Make blue folder label for physical file
- Initial checklist inside folder cover

SHORTLY AFTER MLS ENTRY:
- Send Just Listed postcard; email agent confirmation, copy Gail
- Executive Admin: email broker letter to seller, copy agent, cc Wilson and Gail

The fastest critical path item: if folder is incomplete, the email to the agent goes out immediately — everything else waits on the missing items. MLS entry is blocked until photos are received.`,
  },
];

export async function POST(_req: NextRequest) {
  const results = [];

  for (let i = 0; i < TIMELINE_MEMORIES.length; i += 2) {
    const pair = [TIMELINE_MEMORIES[i], TIMELINE_MEMORIES[i + 1]].filter(Boolean);
    const r = await addMemories(pair, USER_ID, { category: "timeline" });
    results.push(r);
  }

  return NextResponse.json({ ok: true, seeded: results.length, userId: USER_ID });
}
