import { NextRequest, NextResponse } from "next/server";
import { addMemories, deleteAllMemories } from "@/app/lib/mem0";

export const maxDuration = 60;

const USER_ID = "jerrod-hastings";

// All facts extracted from the real 604 2nd St NW, Gordo AL transaction documents
const DEAL_MEMORIES = [
  // Core deal facts
  {
    role: "user" as const,
    content: "What is the property address for my current deal?",
  },
  {
    role: "assistant" as const,
    content:
      "Your deal is at 604 2nd Street Northwest, Gordo, Alabama 35466, Pickens County. File number 3489-26 at North River Title.",
  },
  {
    role: "user" as const,
    content: "Who are the sellers and buyers?",
  },
  {
    role: "assistant" as const,
    content:
      "Sellers: Amy Rohrer, Larry K. Chung, and Xuan Vuong (address: 11097 Carolwood Lakeview Dr, Northport, AL 35475). Buyers: Shaina Fields and Kevin Fields. Both signed closing documents on 06/05/2026.",
  },
  {
    role: "user" as const,
    content: "What is the sale price and financial breakdown?",
  },
  {
    role: "assistant" as const,
    content:
      "Sale price: $208,000. Loan amount: $204,232 (FHA). Earnest money deposit: $1,000 held by KW Tuscaloosa. Seller credit toward buyer closing costs: $9,700. Net to seller at closing: $187,287.44. Total closing costs: $10,400 — Listing agent commission (Pritchett-Moore): $4,160 (2%). Selling agent commission (Keller Williams): $6,240 (3%). County tax proration: $612.56.",
  },
  {
    role: "user" as const,
    content: "What are the key dates for this transaction?",
  },
  {
    role: "assistant" as const,
    content:
      "Property listed: November 16, 2025. Contract signed: April 30, 2026. Closing date: June 5, 2026. Disbursement date: June 5, 2026. The loan type changed from USDA to FHA on May 14, 2026 — this is a material compliance event that required re-executing the FHA Amendatory Clause.",
  },
  {
    role: "user" as const,
    content: "Who are the agents and brokerages involved?",
  },
  {
    role: "assistant" as const,
    content:
      "Listing agent: Jerrod Hastings, Pritchett-Moore Real Estate, Inc., 1120 Queen City Avenue, Tuscaloosa, AL 35401. ST License 000085210. Email: jerrodhastings@yahoo.com. Phone: (205) 310-8487. Buyer's agent: Damon Gann, Keller Williams, 1490 Northbank Pkwy Suite 180, Tuscaloosa, AL 35406. ST License 107531. Email: damongann@kw.com.",
  },
  {
    role: "user" as const,
    content: "Who handled settlement and title?",
  },
  {
    role: "assistant" as const,
    content:
      "Settlement agency: North River Title, Inc., 1490 Northbank Parkway Suite 140, Tuscaloosa, AL 35406. Escrow officer: Brittany Newton. ST License 0658386. Contact: 3003760103. Email: brittany@northrivertitle.com. Phone: (205) 345-5310. ALTA Universal ID: 0792129.",
  },
  {
    role: "user" as const,
    content: "What is the lender information?",
  },
  {
    role: "assistant" as const,
    content:
      "Lender: First Federal Bank ISAOA, a FSB. Address: 1300 McFarland Boulevard North East, Tuscaloosa, AL 35406. FHA loan — upfront MIP: $3,512.60. Loan charges include origination fee: $2,042.32, administration fee: $1,300. Appraisal by Randolph Appraisals, Inc. (Borrower POC: $650).",
  },
  {
    role: "user" as const,
    content: "What compliance flags apply to this property?",
  },
  {
    role: "assistant" as const,
    content:
      "This is a pre-1978 property — Lead-Based Paint Disclosure is required by federal law. The buyer has a 10-day inspection window from contract date. FHA loan type — the FHA Amendatory Clause and Real Estate Certification is required and must be signed. Critical: the loan type changed from USDA to FHA on May 14, 2026, so the FHA Amendatory Clause must have been re-executed at that point. RECAD agency disclosure required. Alabama buyer-beware state — buyers arrange and pay for their own inspections.",
  },
  {
    role: "user" as const,
    content: "What vendors are associated with this deal?",
  },
  {
    role: "assistant" as const,
    content:
      "Title: North River Title, Inc. / Brittany Newton, (205) 345-5310. Lender: First Federal Bank ISAOA. Appraiser: Randolph Appraisals, Inc. Deed preparation: Robert S. Plott, LLC. Homeowner's insurance: Orion 180 ($2,000 premium, $166.67/month for 3 months escrowed). Recording: Pickens County Recording Office. Chicago Title Insurance Company for title policies.",
  },
  {
    role: "user" as const,
    content: "What appliances and personal property are included?",
  },
  {
    role: "assistant" as const,
    content:
      "Included appliances: refrigerator, washer, and dryer. No HOA. Property on municipal sewer.",
  },
];

const PROCEDURE_MEMORIES = [
  {
    role: "user" as const,
    content: "What are the PM listing checklist requirements for a new listing?",
  },
  {
    role: "assistant" as const,
    content:
      "PM Listing checklist — agent must initial each: Listing Agreement Signed, Listing Estimated Net Sheet, PM RECAD Disclosure, State RECAD Notification, Dual Agency Agreement, Designated Single Agency (Wilson Moore must approve this one), Lead-Based Paint Form (required if pre-1978), PM Exclusive Listing Form. Also collect: Lockbox number, Shackle code, CBS code, Owner name, contact phone, secondary phone, and email address.",
  },
  {
    role: "user" as const,
    content: "What does the coordinator do for a new listing?",
  },
  {
    role: "assistant" as const,
    content:
      "New Listing Coordinator Checklist (record date each is completed): 1. Verify folder is complete — signed listing agreement and other forms, photos, contact numbers, lockbox/shackle/CBS codes. If missing, email agent immediately. 2. Receive and upload photos to Alyssa's computer. 3. Enter listing in MLS with photos; convert provisional to active if needed. 4. Email MLS link to listing agent, copy Wilson and Gail. 5. Put listing in Agent News. 6. Log in Excel Master 'Listings' list (emailed Wilson and Gail every Monday). 7. Make blue label for physical file folder. 8. Send Just Listed postcard; email agent confirmation, copy Gail. 9. Place initial checklist inside folder cover. Executive Admin also emails broker letter to seller, copying agent, Wilson, and Gail.",
  },
  {
    role: "user" as const,
    content: "What are the pending sale checklist steps?",
  },
  {
    role: "assistant" as const,
    content:
      "Pending Sales File Checklist (coordinator, record date): 1. Hold earnest money check until agent confirms it is a contract. 2. Put sale in Agent News. 3. Make white label for file folder (if PM listing, place white label over blue). 4. Log in Excel Master 'Sales' list (emailed Wilson and Gail every Monday). If PM listing: 5. Enter MLS from Active to Pending. 6. Log contract date in Excel Master Listings list. 7. If sale has earnest money, take check to Chanda to deposit (if agent approves). 8. Load final contract into Instanet for agent. If NOT PM listing: skip to step 8.",
  },
  {
    role: "user" as const,
    content: "What happens at closing for the file?",
  },
  {
    role: "assistant" as const,
    content:
      "Closed File Procedures (coordinator): 1. Record closed date in Excel Master 'Sales' list; email Wilson. 2. Change MLS status from Pending to Sold. 3. Load HUD/settlement statement into Instanet. 4. Send Just Sold postcards; email agent to let them know. Executive Admin: 1. If commission check — email agent when check is signed and ready for pickup, make copy of statement attached to check, give or scan to Gail. 2. If direct deposit — email deposit slip to agent, copy Gail.",
  },
  {
    role: "user" as const,
    content: "What does the sale checklist require agent to initial?",
  },
  {
    role: "assistant" as const,
    content:
      "Sale checklist — agent must initial per offer for both PM Seller and PM Buyer sides: Contract signed, Net Sheet (required for every offer amount), Lead-Based Paint, PM RECAD Disclosure, State RECAD Notification, Buyer's Agency, Dual Agency, Designated Single Agency (Wilson must approve), Signed HUD. Also required: Concessions amount (must be completed), selling agent and listing agent professional service fee and permission to change, pending date, closing date, property type (Residential/Condo/Commercial/Land).",
  },
];

export async function POST(req: NextRequest) {
  const { reset } = await req.json().catch(() => ({ reset: false }));

  if (reset) {
    await deleteAllMemories(USER_ID);
  }

  const results = [];

  // Seed deal memories in batches (each call = one memory context)
  for (const pair of chunkPairs(DEAL_MEMORIES)) {
    const r = await addMemories(pair, USER_ID, { category: "deal", property: "604-gordo" });
    results.push(r);
  }

  // Seed procedure memories
  for (const pair of chunkPairs(PROCEDURE_MEMORIES)) {
    const r = await addMemories(pair, USER_ID, { category: "procedure" });
    results.push(r);
  }

  return NextResponse.json({ ok: true, seeded: results.length, userId: USER_ID });
}

// Group into Q+A pairs for Mem0
function chunkPairs<T>(arr: T[]): T[][] {
  const pairs: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) {
    if (arr[i + 1]) pairs.push([arr[i], arr[i + 1]]);
  }
  return pairs;
}
