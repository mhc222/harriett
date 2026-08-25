import { CheckCheck, Clock3 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { createUserClient } from "@/lib/db/server";

export default async function ApprovalsPage() {
  const db = await createUserClient();
  const { data: approvals } = await db
    .from("action_requests")
    .select("id, skill_name, summary, recipient_kind, status, required_approver, created_at, agents(name)")
    .in("status", ["proposed", "approved", "running"])
    .order("created_at", { ascending: false });
  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">Human review</p><h1>Approvals</h1><p className="page-intro">Exact actions Harriett is waiting to perform, with the responsible reviewer and recipient shown.</p></div></header>
      <section aria-labelledby="approval-queue-heading">
        <div className="section-heading"><div><p className="section-kicker">Queue</p><h2 id="approval-queue-heading">Waiting for a decision</h2></div><span className="section-count">{approvals?.length ?? 0}</span></div>
        {approvals?.length ? <div className="record-list">{approvals.map((approval) => {
          const agent = Array.isArray(approval.agents) ? approval.agents[0] : approval.agents;
          return <article className="record-row" key={approval.id}>
            <span className="record-primary"><strong>{approval.summary}</strong><span>{agent?.name ?? "Harriett user"}, {approval.recipient_kind ?? "internal"}</span></span>
            <span className="record-secondary"><span><Clock3 size={14} />{new Date(approval.created_at).toLocaleString()}</span><span>Review by {approval.required_approver}</span></span>
            <span className="status-label">{approval.status}</span>
          </article>;
        })}</div> : <EmptyState icon={CheckCheck} title="No approvals waiting." detail="Email drafts and consequential actions will wait here before anything is sent." />}
      </section>
    </div>
  );
}
