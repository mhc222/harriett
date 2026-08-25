import Link from "next/link";
import { ArrowRight, Database, Search } from "lucide-react";
import { ResearchForm } from "@/components/research-form";
import { createUserClient } from "@/lib/db/server";

interface PropertyJoin {
  formatted_address: string;
  city: string | null;
  state: string | null;
  property_type: string | null;
}

function dateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const db = await createUserClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  let researchQuery = db
    .from("property_research_runs")
    .select("id, research_type, provider, status, summary, confidence_flags, provider_call_count, source_observed_at, created_at, properties!inner(formatted_address, city, state, property_type)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (q?.trim()) researchQuery = researchQuery.ilike("properties.formatted_address", `%${q.trim()}%`);

  const [{ data: research }, { data: monthlyRuns }] = await Promise.all([
    researchQuery,
    db
      .from("property_research_runs")
      .select("provider_call_count")
      .eq("provider", "rentcast")
      .gte("created_at", monthStart.toISOString()),
  ]);
  const callsUsed = (monthlyRuns ?? []).reduce((sum, run) => sum + run.provider_call_count, 0);

  return (
    <div className="page-stack">
      <header className="page-heading research-heading">
        <div>
          <p className="eyebrow">Property intelligence</p>
          <h1>Research</h1>
          <p className="page-intro">Property facts, preliminary valuations, and the work Harriett builds from them.</p>
        </div>
        <div className="usage-meter" aria-label={`${callsUsed} of 50 RentCast calls used this month`}>
          <span><Database size={16} /> RentCast this month</span>
          <strong>{callsUsed}<small>/50</small></strong>
          <span className="usage-track"><span style={{ width: `${Math.min((callsUsed / 50) * 100, 100)}%` }} /></span>
        </div>
      </header>

      <section aria-labelledby="new-research-heading">
        <div className="section-heading compact">
          <div>
            <p className="section-kicker">New request</p>
            <h2 id="new-research-heading">Research a property</h2>
          </div>
        </div>
        <ResearchForm />
      </section>

      <section aria-labelledby="research-history-heading">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Saved work</p>
            <h2 id="research-history-heading">Research history</h2>
          </div>
          <form className="list-search" action="/research">
            <label className="sr-only" htmlFor="research-filter">Search research</label>
            <Search size={16} aria-hidden="true" />
            <input id="research-filter" name="q" defaultValue={q} placeholder="Search address" />
          </form>
        </div>

        {research?.length ? (
          <div className="research-list">
            {research.map((run) => {
              const property = (Array.isArray(run.properties) ? run.properties[0] : run.properties) as PropertyJoin | null;
              return (
                <Link href={`/research/${run.id}`} key={run.id} className="research-row">
                  <span className="research-address">
                    <strong>{property?.formatted_address ?? "Property research"}</strong>
                    <span>{run.summary ?? "Saved property research"}</span>
                  </span>
                  <span className="research-source">
                    <span>{run.provider}</span>
                    <span>{dateTime(run.created_at)}</span>
                  </span>
                  <span className="status-label">{run.research_type === "valuation" ? "Valuation" : "Property note"}</span>
                  <ArrowRight size={17} className="row-arrow" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="quiet-state">
            <Search size={22} aria-hidden="true" />
            <div>
              <p className="font-semibold text-ink">No research found.</p>
              <p>{q ? "Try a different address." : "Start with a Tuscaloosa property above."}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
