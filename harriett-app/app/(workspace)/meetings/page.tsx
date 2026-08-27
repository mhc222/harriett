import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Mic, TriangleAlert } from "lucide-react";
import { MeetingCaptureForm } from "@/components/meeting-capture-form";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";

export default async function MeetingsPage() {
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return null;
  const [{ data: deals }, { data: contacts }, { data: captures }] = await Promise.all([
    db.from("deals").select("id,address,city,state").not("status", "in", "(closed,cancelled)").order("updated_at", { ascending: false }),
    db.from("contacts").select("id,name,kind").order("name"),
    db.from("meeting_captures")
      .select("id,title,source_type,status,occurred_at,error_message,deal_id,summary_artifact_id,artifacts!meeting_captures_summary_artifact_id_fkey(id,title,plain_text,content)")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  const dealOptions = (deals ?? []).map((deal) => ({ id: deal.id, label: `${deal.address}${deal.city ? `, ${deal.city}` : ""}` }));
  const contactOptions = (contacts ?? []).map((contact) => ({ id: contact.id, label: `${contact.name} (${contact.kind.replaceAll("_", " ")})` }));

  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">Capture the work</p><h1>Meetings and voice notes</h1><p className="page-intro">Record with permission or talk through a quick memo. Harriett saves the summary and follow-up work, never a transcript.</p></div></header>
      <section aria-labelledby="new-capture-heading"><div className="section-heading"><div><p className="section-kicker">New capture</p><h2 id="new-capture-heading">What just happened?</h2></div></div><MeetingCaptureForm deals={dealOptions} contacts={contactOptions} /></section>
      <section aria-labelledby="meeting-history-heading">
        <div className="section-heading"><div><p className="section-kicker">History</p><h2 id="meeting-history-heading">Recent captures</h2></div><span className="section-count">{captures?.length ?? 0}</span></div>
        {captures?.length ? <div className="artifact-list">{captures.map((capture) => {
          const artifact = Array.isArray(capture.artifacts) ? capture.artifacts[0] : capture.artifacts;
          const Icon = capture.status === "completed" ? CheckCircle2 : capture.status === "failed" ? TriangleAlert : Clock3;
          return <article className="artifact-card" key={capture.id}><div className={`work-icon ${capture.status === "failed" ? "work-icon-alert" : ""}`}><Icon size={18} /></div><div className="min-w-0 flex-1"><div className="artifact-card-heading"><h3>{capture.title}</h3><span className="status-label">{capture.status}</span></div><p className="work-meta">{new Date(capture.occurred_at).toLocaleString()} · {capture.source_type.replaceAll("_", " ")}</p>{artifact?.plain_text && <p>{artifact.plain_text}</p>}{capture.error_message && <p className="text-crimson">{capture.error_message}</p>}{capture.deal_id && <Link href={`/deals/${capture.deal_id}`} className="text-link">Open transaction <ArrowRight size={14} /></Link>}</div></article>;
        })}</div> : <div className="quiet-state"><Mic size={22} /><p>Your meeting summaries and voice notes will appear here.</p></div>}
      </section>
    </div>
  );
}
