import type { DealFields } from "./types";

const MEM0_BASE = "https://api.mem0.ai/v1";

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Token ${process.env.MEM0_API_KEY}`,
  };
}

export async function addMemories(
  messages: { role: "user" | "assistant"; content: string }[],
  userId: string,
  metadata?: Record<string, string>
) {
  const res = await fetch(`${MEM0_BASE}/memories/`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ messages, user_id: userId, metadata }),
  });
  if (!res.ok) throw new Error(`Mem0 add failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function searchMemories(query: string, userId: string, limit = 10) {
  const res = await fetch(`${MEM0_BASE}/memories/search/`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ query, user_id: userId, limit }),
  });
  if (!res.ok) throw new Error(`Mem0 search failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ results: { id: string; memory: string; score: number }[] }>;
}

export async function listMemories(userId: string) {
  const res = await fetch(`${MEM0_BASE}/memories/?user_id=${userId}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Mem0 list failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ results: { id: string; memory: string; created_at: string }[] }>;
}

export async function deleteAllMemories(userId: string) {
  const res = await fetch(`${MEM0_BASE}/memories/?user_id=${userId}`, {
    method: "DELETE",
    headers: headers(),
  });
  return res.ok;
}

// Build a rich natural-language summary of a deal so Mem0's LLM can extract
// clean, searchable facts. Called after every parse and after stage/vendor changes.
function dealSummary(deal: DealFields): string {
  const price = (n: number | null) =>
    n ? `$${n.toLocaleString()}` : "unknown";
  const list = (arr: string[]) =>
    arr.length ? arr.join(", ") : "unknown";

  const flags: string[] = [];
  if (deal.flags.leadPaintDisclosure)
    flags.push("pre-1978 property — lead paint disclosure required and executed");
  if (deal.flags.fhaLoan)
    flags.push("FHA loan — FHA Amendatory Clause required");
  if (deal.flags.loanTypeChanged)
    flags.push("loan type changed mid-transaction — re-execute FHA Amendatory Clause");
  if (deal.flags.recadRequired)
    flags.push("RECAD agency disclosure required");
  if (deal.flags.buyerBeware)
    flags.push("Alabama buyer-beware state — buyer arranges and pays for inspections");

  return [
    `Deal: ${deal.address}, ${deal.city}, ${deal.state} ${deal.zip}${deal.county ? ` (${deal.county} County)` : ""}.`,
    `Property: ${deal.propertyType}${deal.bedBath ? `, ${deal.bedBath}` : ""}${deal.sqft ? `, ${deal.sqft.toLocaleString()} sqft` : ""}${deal.yearBuilt ? `, built ${deal.yearBuilt}` : ""}.`,
    `Sellers: ${list(deal.sellers)}.`,
    deal.buyers.length ? `Buyers: ${list(deal.buyers)}.` : "",
    `Listing agent: ${deal.listingAgent} (${deal.brokerage}).`,
    deal.buyerAgent ? `Buyer agent: ${deal.buyerAgent}${deal.buyerBrokerage ? ` (${deal.buyerBrokerage})` : ""}.` : "",
    `List price: ${price(deal.listPrice)}.`,
    deal.salePrice ? `Sale price: ${price(deal.salePrice)}.` : "",
    deal.earnestMoney ? `Earnest money: ${price(deal.earnestMoney)}.` : "",
    deal.sellerConcessions ? `Seller concessions toward buyer closing costs: ${price(deal.sellerConcessions)}.` : "",
    deal.loanType ? `Loan type: ${deal.loanType}.` : "",
    `Listing date: ${deal.listingDate}. Closing date: ${deal.closingDate}.`,
    deal.appurtenances.length ? `Included appliances/items: ${list(deal.appurtenances)}.` : "",
    deal.mlsNumber ? `MLS number: ${deal.mlsNumber}.` : "",
    deal.subdivision ? `Subdivision: ${deal.subdivision}.` : "",
    flags.length ? `Compliance flags: ${flags.join("; ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

// Seed a full deal into Mem0 as a single assistant message summarizing everything.
// Call after parse, after stage changes, and after vendor/checklist updates.
export async function seedDealMemory(deal: DealFields, userId: string) {
  return addMemories(
    [{ role: "assistant", content: dealSummary(deal) }],
    userId,
    { source: "deal_parse", address: deal.address }
  );
}

// Record an incremental update (stage change, vendor confirmed, checklist item, etc.)
// Example: updateDealMemory("604 2nd St NW Gordo: stage changed to under_contract.", userId)
export async function updateDealMemory(fact: string, userId: string) {
  return addMemories(
    [{ role: "assistant", content: fact }],
    userId,
    { source: "deal_update" }
  );
}
