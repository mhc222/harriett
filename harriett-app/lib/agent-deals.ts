import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export const AgentDealSearchInputSchema = z.object({
  query: z.string().trim().max(200).optional(),
  includeClosed: z.boolean().default(false),
  limit: z.number().int().min(1).max(20).default(10),
});
export type AgentDealSearchInput = z.infer<typeof AgentDealSearchInputSchema>;

export const AgentDealSearchOutputSchema = z.object({
  deals: z.array(z.object({
    id: z.string().uuid(),
    address: z.string(),
    city: z.string().nullable(),
    status: z.string(),
    listPrice: z.number().nullable(),
    salePrice: z.number().nullable(),
    contractAcceptanceDate: z.string().nullable(),
    closingDate: z.string().nullable(),
  })),
});
export type AgentDealSearchOutput = z.infer<typeof AgentDealSearchOutputSchema>;
export type AgentDealSummary = AgentDealSearchOutput["deals"][number];

export async function searchAgentDeals(
  db: SupabaseClient,
  context: { officeId: string; agentId: string },
  rawInput: AgentDealSearchInput
): Promise<AgentDealSearchOutput> {
  const input = AgentDealSearchInputSchema.parse(rawInput);
  let query = db
    .from("deals")
    .select("id, address, city, status, list_price, sale_price, contract_acceptance_date, closing_date")
    .eq("office_id", context.officeId)
    .eq("agent_id", context.agentId)
    .order("updated_at", { ascending: false })
    .limit(input.limit);
  if (!input.includeClosed) query = query.not("status", "in", "(closed,cancelled)");
  if (input.query) query = query.ilike("address", `%${input.query}%`);
  const { data, error } = await query;
  if (error) throw new Error(`deal search failed: ${error.message}`);
  return AgentDealSearchOutputSchema.parse({
    deals: (data ?? []).map((deal) => ({
      id: deal.id,
      address: deal.address,
      city: deal.city,
      status: deal.status,
      listPrice: deal.list_price == null ? null : Number(deal.list_price),
      salePrice: deal.sale_price == null ? null : Number(deal.sale_price),
      contractAcceptanceDate: deal.contract_acceptance_date,
      closingDate: deal.closing_date,
    })),
  });
}

function currency(value: number | null): string | null {
  return value == null
    ? null
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pre_listing: "Pre-listing",
    listing_active: "Active listing",
    under_contract: "Under contract",
    closing: "Closing",
    closed: "Closed",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

function shortDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function formatAgentDealPortfolio(deals: AgentDealSummary[], now = new Date()): string {
  if (!deals.length) {
    return "I don’t see any current transaction records assigned to you.";
  }

  const activeCount = deals.filter((deal) => deal.status === "listing_active").length;
  const pendingCount = deals.filter((deal) => ["under_contract", "closing"].includes(deal.status)).length;
  const countParts = [
    activeCount ? `${activeCount} active ${activeCount === 1 ? "listing" : "listings"}` : null,
    pendingCount ? `${pendingCount} ${pendingCount === 1 ? "file" : "files"} under contract` : null,
  ].filter(Boolean);
  const opening = countParts.length
    ? `I found ${countParts.join(" and ")} assigned to you:`
    : `I found ${deals.length} current ${deals.length === 1 ? "transaction" : "transactions"} assigned to you:`;

  const lines = deals.map((deal) => {
    const location = deal.city ? `${deal.address}, ${deal.city}` : deal.address;
    const price = currency(deal.status === "listing_active" ? deal.listPrice : deal.salePrice ?? deal.listPrice);
    const closing = shortDate(deal.closingDate);
    const closingInstant = deal.closingDate ? new Date(`${deal.closingDate}T23:59:59Z`) : null;
    const hasPastClosingDate = closingInstant
      ? closingInstant.getTime() < now.getTime() && !["closed", "cancelled"].includes(deal.status)
      : false;
    const closingDetail = closing
      ? hasPastClosingDate
        ? `recorded closing ${closing}, status needs review`
        : `closing ${closing}`
      : null;
    const details = [statusLabel(deal.status), price, closingDetail].filter(Boolean);
    return `- ${location}${details.length ? `, ${details.join(", ")}` : ""}`;
  });
  return `${opening}\n\n${lines.join("\n")}`;
}
