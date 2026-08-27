import Link from "next/link";
import { CheckCheck, ClipboardList } from "lucide-react";
import { WorkItemStatus } from "@/components/work-item-status";
import { createUserClient } from "@/lib/db/server";

const kindLabels: Record<string, string> = {
  general: "General",
  meeting_follow_up: "Meeting follow-up",
  marketing: "Marketing",
  photo_coordination: "Photography",
  document_drafting: "Document",
};

export default async function WorkPage() {
  const db = await createUserClient();
  const { data: work } = await db.from("work_items")
    .select("id,title,detail,status,priority,due_at,kind,deal_id,deals(address)")
    .not("status", "in", "(completed,cancelled)")
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);
  return <div className="page-stack">
    <header className="page-heading"><div><p className="eyebrow">One work queue</p><h1>Work</h1><p className="page-intro">Follow-ups from meetings, marketing, photography, documents, and daily transaction work.</p></div></header>
    <section aria-labelledby="open-work-heading"><div className="section-heading"><div><p className="section-kicker">Open</p><h2 id="open-work-heading">What needs doing</h2></div><span className="section-count">{work?.length ?? 0}</span></div>
      {work?.length ? <div className="work-list">{work.map((item) => {
        const deal = Array.isArray(item.deals) ? item.deals[0] : item.deals;
        return <div className="work-row" key={item.id}><span className="work-icon"><ClipboardList size={18} /></span><span className="min-w-0 flex-1"><span className="work-title">{item.title}</span><span className="work-meta">{kindLabels[item.kind] ?? item.kind}{deal?.address ? <> · <Link href={`/deals/${item.deal_id}`} className="text-link">{deal.address}</Link></> : null}{item.due_at ? ` · Due ${new Date(item.due_at).toLocaleDateString()}` : ""}</span>{item.detail && <span className="work-detail">{item.detail}</span>}</span><span className={`priority-label priority-${item.priority}`}>{item.priority}</span><WorkItemStatus id={item.id} status={item.status} /></div>;
      })}</div> : <div className="quiet-state"><CheckCheck size={22} /><p>There is no open work right now.</p></div>}
    </section>
  </div>;
}
