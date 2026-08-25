import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CalendarClock, MapPin } from "lucide-react";
import { ContractUpload } from "@/components/contract-upload";
import { EmptyState } from "@/components/empty-state";
import { createUserClient } from "@/lib/db/server";

const statusLabels: Record<string, string> = {
  pre_listing: "Pre-listing",
  listing_active: "Active listing",
  under_contract: "Under contract",
  closing: "Closing",
  closed: "Closed",
  cancelled: "Cancelled",
};

export default async function PipelinePage() {
  const db = await createUserClient();
  const { data: deals } = await db
    .from("deals")
    .select("id, address, city, state, status, list_price, sale_price, closing_date, agents(name)")
    .not("status", "in", "(closed,cancelled)")
    .order("updated_at", { ascending: false });

  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">Office work</p><h1>Pipeline</h1><p className="page-intro">Pre-listings and active transactions, ordered by what changed most recently.</p></div><ContractUpload /></header>
      <section aria-labelledby="active-pipeline-heading">
        <div className="section-heading"><div><p className="section-kicker">Current</p><h2 id="active-pipeline-heading">Active pipeline</h2></div><span className="section-count">{deals?.length ?? 0}</span></div>
        {deals?.length ? <div className="record-list">{deals.map((deal) => {
          const agent = Array.isArray(deal.agents) ? deal.agents[0] : deal.agents;
          return <Link href={`/deals/${deal.id}`} className="record-row record-link" key={deal.id}>
            <span className="record-primary"><strong>{deal.address}</strong><span><MapPin size={13} />{[deal.city, deal.state].filter(Boolean).join(", ")}</span></span>
            <span className="record-secondary"><span>{agent?.name ?? "Agent not assigned"}</span>{deal.closing_date && <span><CalendarClock size={14} />Closing {deal.closing_date}</span>}</span>
            <span className="status-label">{statusLabels[deal.status] ?? deal.status}</span>
            <ArrowRight size={17} className="row-arrow" />
          </Link>;
        })}</div> : <EmptyState icon={BriefcaseBusiness} title="No active transactions yet." detail="New listings and contracts will land here as Harriett detects them." />}
      </section>
    </div>
  );
}
