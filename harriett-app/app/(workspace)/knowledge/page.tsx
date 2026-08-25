import { BookOpenText, CalendarCheck2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { createUserClient } from "@/lib/db/server";

export default async function KnowledgePage() {
  const db = await createUserClient();
  const { data: sources } = await db
    .from("knowledge_sources")
    .select("id, title, kind, authority, status, effective_from, effective_to, updated_at")
    .order("authority", { ascending: false });
  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">Office truth</p><h1>Knowledge</h1><p className="page-intro">Published procedures, forms, regulations, templates, and training Harriett can cite.</p></div></header>
      <section aria-labelledby="knowledge-heading">
        <div className="section-heading"><div><p className="section-kicker">Published sources</p><h2 id="knowledge-heading">Knowledge library</h2></div><span className="section-count">{sources?.length ?? 0}</span></div>
        {sources?.length ? <div className="record-list">{sources.map((source) => <article className="record-row" key={source.id}>
          <span className="record-primary"><strong>{source.title}</strong><span className="capitalize">{source.kind.replaceAll("_", " ")}</span></span>
          <span className="record-secondary"><span>Authority {source.authority}</span>{source.effective_from && <span><CalendarCheck2 size={14} />Effective {source.effective_from}</span>}</span>
          <span className="status-label">{source.status}</span>
        </article>)}</div> : <EmptyState icon={BookOpenText} title="No knowledge published yet." detail="Office procedures and compliance sources will appear after broker review." />}
      </section>
    </div>
  );
}
