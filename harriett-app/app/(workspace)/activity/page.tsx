import { Activity, Bot, FileClock } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { createUserClient } from "@/lib/db/server";

export default async function ActivityPage() {
  const db = await createUserClient();
  const { data: events } = await db
    .from("deal_events")
    .select("id, event, source, payload, occurred_at, deals(address), agents(name)")
    .order("occurred_at", { ascending: false })
    .limit(100);
  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">Recorded history</p><h1>Activity</h1><p className="page-intro">A readable timeline of work across people, deals, messages, and connected systems.</p></div></header>
      <section aria-labelledby="activity-heading">
        <div className="section-heading"><div><p className="section-kicker">Latest</p><h2 id="activity-heading">Office activity</h2></div></div>
        {events?.length ? <div className="timeline">{events.map((event) => {
          const deal = Array.isArray(event.deals) ? event.deals[0] : event.deals;
          const agent = Array.isArray(event.agents) ? event.agents[0] : event.agents;
          return <article className="timeline-row" key={event.id}>
            <span className="timeline-icon">{event.source === "harriett" ? <Bot size={17} /> : <FileClock size={17} />}</span>
            <span><strong>{event.event.replaceAll("_", " ")}</strong><small>{[deal?.address, agent?.name, event.source].filter(Boolean).join(", ")}</small></span>
            <time>{new Date(event.occurred_at).toLocaleString()}</time>
          </article>;
        })}</div> : <EmptyState icon={Activity} title="No deal activity yet." detail="Detected changes and completed work will form the office timeline here." />}
      </section>
    </div>
  );
}
