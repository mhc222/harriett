import { NextRequest, NextResponse } from "next/server";
import { addMemories } from "@/app/lib/mem0";

export const maxDuration = 60;

const USER_ID = "jerrod-hastings";

const LAW_MEMORIES = [
  // Caveat emptor
  {
    role: "user" as const,
    content: "Does Alabama require sellers to disclose property defects?",
  },
  {
    role: "assistant" as const,
    content:
      "Alabama is a caveat emptor (buyer beware) state. Sellers are NOT required by law to fill out a disclosure form. The burden is on the buyer to inspect and discover defects. However, three exceptions require seller disclosure: (1) buyer asks a direct question — the seller cannot lie; (2) known health or safety hazards — must be disclosed even if the buyer didn't ask; (3) fiduciary relationship exists between buyer and seller. Federal overlay: pre-1978 properties always require Lead-Based Paint Disclosure and the EPA pamphlet regardless of state rules.",
  },
  // Attorney state
  {
    role: "user" as const,
    content: "Who must handle the closing in Alabama?",
  },
  {
    role: "assistant" as const,
    content:
      "Alabama is an attorney state. A licensed attorney must handle the closing process, including title examination and preparation of legal documents such as deeds and powers of attorney. Alabama is one of only two states with this requirement. Closings typically take 30 to 45 days from accepted offer. Required closing documents: deed (seller signature must be notarized), Closing Disclosure, title insurance policy, mortgage documents if applicable, and often a termite letter.",
  },
  // Written contract
  {
    role: "user" as const,
    content: "What makes a real estate contract enforceable in Alabama?",
  },
  {
    role: "assistant" as const,
    content:
      "Alabama requires a written contract signed by both parties to make a real estate transaction enforceable under the Statute of Frauds. The contract must include: parties, property description, purchase price, and closing date. Verbal agreements for real estate are not enforceable.",
  },
  // RECAD and Act 2025-59
  {
    role: "user" as const,
    content: "What changed in Alabama agency disclosure law with Act 2025-59?",
  },
  {
    role: "assistant" as const,
    content:
      "Alabama Act 2025-59 (signed by Governor Kay Ivey, April 18, 2025) made Alabama the first state to reform NAR settlement buyer-agreement rules. Key changes: (1) Buyers cannot be forced to sign a binding representation agreement just to tour a home. (2) A written brokerage agreement IS required before a buyer submits an offer and before a seller lists a property. (3) The RECAD (Real Estate Consumer Agency Disclosure) form is still required before property tours. (4) Every agency's disclosure policy must clearly explain how agents are compensated. Pritchett-Moore's RECAD and agency disclosure forms remain required on every transaction.",
  },
  // Lead paint
  {
    role: "user" as const,
    content: "When is lead-based paint disclosure required?",
  },
  {
    role: "assistant" as const,
    content:
      "Federal law requires Lead-Based Paint Disclosure for any property built before 1978. This applies regardless of state law and regardless of whether Alabama's caveat emptor rule would otherwise exempt the seller from disclosure. The seller must disclose any known lead-based paint history AND provide the EPA pamphlet 'Protect Your Family From Lead in Your Home.' The buyer has a 10-day window to conduct a lead paint inspection unless they waive it in writing. The 604 Gordo property is pre-1978, so this disclosure was required and executed.",
  },
  // Governing law
  {
    role: "user" as const,
    content: "What are the main laws governing Alabama real estate?",
  },
  {
    role: "assistant" as const,
    content:
      "Alabama residential real estate is governed by: Alabama Code Title 34 Chapter 27 (licensing and consumer protections), Title 35 Chapter 9A (Uniform Residential Landlord and Tenant Act, effective January 1, 2007), and Title 8 Chapter 42 (residential real estate transaction rules). The Alabama Real Estate Commission (AREC), established in 1928, oversees all agent and broker licensing. AREC website: arec.alabama.gov.",
  },
  // Wholesaling
  {
    role: "user" as const,
    content: "Is wholesaling legal in Alabama?",
  },
  {
    role: "assistant" as const,
    content:
      "Under Alabama Code Section 8-42-2 (2024), it is a Class C misdemeanor to acquire an equitable interest in a single-family property and assign it to another for a fee unless written disclosure is made to both the original seller (of the buyer's intent to assign) and the ultimate transferee (of the nature of the equitable interest). This targets unregulated wholesaling. Agents should flag any wholesale-style transaction and ensure proper disclosures are made.",
  },
  // HOA
  {
    role: "user" as const,
    content: "What rules govern HOAs in Alabama?",
  },
  {
    role: "assistant" as const,
    content:
      "HOAs formed on or after January 1, 2016 are governed by the Alabama Homeowners Association Act, which covers formation, records access, board elections, and lien rights for unpaid dues. Older HOAs can opt in. HOAs must comply with the Federal Fair Housing Act in all rule enforcement. Alabama has no statewide rent control, and municipalities are explicitly prohibited from enacting their own rent control ordinances.",
  },
  // Homestead
  {
    role: "user" as const,
    content: "What are Alabama homestead protections?",
  },
  {
    role: "assistant" as const,
    content:
      "Alabama homestead (up to 160 acres) is exempt from levy and sale for debt collection during the owner's lifetime while occupied. Spouses jointly owning a homestead can each separately claim the exemption. Property tax exemptions under Title 40-9-19: homeowners under 65 (not disabled) get up to $4,000 assessed value state exemption and $2,000 county; age 65+ with income over $12k get all state ad valorem taxes exempt; age 65+ with income under $12k net federal or permanently disabled get all state AND county ad valorem taxes exempt.",
  },
  // Earnest money
  {
    role: "user" as const,
    content: "What are the Alabama rules on earnest money?",
  },
  {
    role: "assistant" as const,
    content:
      "Under Alabama Real Estate License Law Rule 790-X-3-.03(4)(5), if either buyer or seller claims earnest money without agreement of the other party, the broker holding it must either retain it until there is a written agreement among the parties or interplead it into Court. The broker holding earnest money cannot release it unilaterally. If the buyer fails to carry out the contract, earnest money is forfeited as liquidated damages per Alabama law at the seller's option. The seller may also cancel the contract if the earnest money check is rejected by the bank or not delivered by the specified date.",
  },
  // FinCEN
  {
    role: "user" as const,
    content: "Does FinCEN's residential real estate reporting rule apply?",
  },
  {
    role: "assistant" as const,
    content:
      "The FinCEN residential real estate reporting rule (effective March 1, 2026) required reporting of non-financed residential transfers where the buyer is an LLC, trust, or other entity. However, on March 19, 2026, a federal court in Texas vacated the rule, finding FinCEN exceeded its statutory authority under the Bank Secrecy Act. The rule is currently struck down. It may be appealed. As of June 2026, this rule is NOT in effect, but agents should monitor for reinstatement.",
  },
];

export async function POST(_req: NextRequest) {
  const results = [];

  for (let i = 0; i < LAW_MEMORIES.length; i += 2) {
    const pair = [LAW_MEMORIES[i], LAW_MEMORIES[i + 1]].filter(Boolean);
    const r = await addMemories(pair, USER_ID, { category: "alabama-law" });
    results.push(r);
  }

  return NextResponse.json({ ok: true, seeded: results.length, userId: USER_ID });
}
