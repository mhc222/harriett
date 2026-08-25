import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCheck,
  CircleAlert,
  Clock3,
  Search,
} from "lucide-react";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";

interface PropertyJoin {
  formatted_address: string;
  city: string | null;
  state: string | null;
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(`${value}T12:00:00`)
  );
}

function todayHeading(role: string): string {
  if (role === "coordinator") return "Keep the office moving";
  if (role === "broker") return "What needs your attention";
  return "Your work for today";
}

export default async function TodayPage() {
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return null;
  const today = new Date().toISOString().slice(0, 10);
  const headingDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const [agentResult, workResult, approvalResult, eventResult, researchResult, dealResult] =
    await Promise.all([
      db.from("agents").select("name").eq("id", auth.agentId).single(),
      db
        .from("work_items")
        .select("id, title, detail, status, priority, due_at")
        .not("status", "in", "(completed,cancelled)")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(6),
      db
        .from("action_requests")
        .select("id, summary, required_approver, created_at")
        .eq("status", "proposed")
        .order("created_at", { ascending: false })
        .limit(5),
      db
        .from("calendar_events")
        .select("id, title, date, type, address")
        .gte("date", today)
        .order("date")
        .limit(5),
      db
        .from("property_research_runs")
        .select("id, summary, provider, created_at, properties(formatted_address, city, state)")
        .order("created_at", { ascending: false })
        .limit(4),
      db
        .from("deals")
        .select("id, status")
        .not("status", "in", "(closed,cancelled)"),
    ]);

  const firstName = agentResult.data?.name?.split(" ")[0] ?? "there";
  const work = workResult.data ?? [];
  const approvals = approvalResult.data ?? [];
  const events = eventResult.data ?? [];
  const research = researchResult.data ?? [];
  const openDeals = dealResult.data?.length ?? 0;
  const attentionCount = work.length + approvals.length;

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <p className="eyebrow">{headingDate}</p>
          <h1>{todayHeading(auth.role)}</h1>
          <p className="page-intro">Good afternoon, {firstName}. Harriett is watching {openDeals} active {openDeals === 1 ? "deal" : "deals"}.</p>
        </div>
        <Link href="/research" className="primary-button">
          <Search size={17} aria-hidden="true" />
          Research a property
        </Link>
      </header>

      <section aria-labelledby="attention-heading">
        <div className="section-heading">
          <div>
            <p className="section-kicker">First up</p>
            <h2 id="attention-heading">Needs attention</h2>
          </div>
          <span className="section-count">{attentionCount}</span>
        </div>

        {attentionCount ? (
          <div className="work-list">
            {approvals.map((approval) => (
              <Link href="/approvals" key={approval.id} className="work-row">
                <span className="work-icon work-icon-alert"><CircleAlert size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="work-title">{approval.summary}</span>
                  <span className="work-meta">Waiting for {approval.required_approver} approval</span>
                </span>
                <ArrowRight size={17} className="row-arrow" />
              </Link>
            ))}
            {work.map((item) => (
              <div key={item.id} className="work-row">
                <span className="work-icon"><Clock3 size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="work-title">{item.title}</span>
                  <span className="work-meta">{item.detail ?? (item.due_at ? `Due ${new Date(item.due_at).toLocaleDateString()}` : "Open work")}</span>
                </span>
                <span className={`priority-label priority-${item.priority}`}>{item.priority}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="quiet-state">
            <CheckCheck size={22} aria-hidden="true" />
            <div>
              <p className="font-semibold text-ink">You are caught up.</p>
              <p>New requests, approvals, and exceptions will land here.</p>
            </div>
          </div>
        )}
      </section>

      <div className="dashboard-columns">
        <section aria-labelledby="coming-up-heading">
          <div className="section-heading compact">
            <div>
              <p className="section-kicker">Calendar</p>
              <h2 id="coming-up-heading">Coming up</h2>
            </div>
          </div>
          {events.length ? (
            <div className="compact-list">
              {events.map((event) => (
                <div className="compact-row" key={event.id}>
                  <span className="date-tile"><strong>{dateLabel(event.date).split(" ")[1]}</strong>{dateLabel(event.date).split(" ")[0]}</span>
                  <span className="min-w-0">
                    <span className="work-title">{event.title}</span>
                    <span className="work-meta truncate">{event.address || event.type}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="quiet-state compact"><CalendarDays size={20} /><p>Nothing scheduled yet.</p></div>
          )}
        </section>

        <section aria-labelledby="recent-work-heading">
          <div className="section-heading compact">
            <div>
              <p className="section-kicker">Saved by Harriett</p>
              <h2 id="recent-work-heading">Recent work</h2>
            </div>
            <Link href="/research" className="text-link">View research</Link>
          </div>
          {research.length ? (
            <div className="compact-list">
              {research.map((run) => {
                const property = (Array.isArray(run.properties) ? run.properties[0] : run.properties) as PropertyJoin | null;
                return (
                  <Link href={`/research/${run.id}`} className="compact-row compact-link" key={run.id}>
                    <span className="work-icon"><Search size={17} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="work-title truncate">{property?.formatted_address ?? "Property research"}</span>
                      <span className="work-meta truncate">{run.summary ?? `Research from ${run.provider}`}</span>
                    </span>
                    <ArrowRight size={16} className="row-arrow" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="quiet-state compact"><Search size={20} /><p>Your saved research will appear here.</p></div>
          )}
        </section>
      </div>
    </div>
  );
}
