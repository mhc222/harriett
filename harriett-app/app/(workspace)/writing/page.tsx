import { FileText, PenLine } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { createUserClient } from "@/lib/db/server";

export default async function WritingPage() {
  const db = await createUserClient();
  const [{ data: samples }, { data: profile }] = await Promise.all([
    db
      .from("writing_samples")
      .select("id, kind, title, content, source, selected, created_at")
      .order("created_at", { ascending: false }),
    db
      .from("writing_profiles")
      .select("id, version, profile, active, created_at")
      .eq("active", true)
      .maybeSingle(),
  ]);

  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">Your voice</p><h1>Writing</h1><p className="page-intro">The examples and corrections Harriett uses for emails, MLS remarks, marketing, and social drafts.</p></div></header>
      <div className="dashboard-columns">
        <section aria-labelledby="writing-profile-heading">
          <div className="section-heading compact"><div><p className="section-kicker">Active profile</p><h2 id="writing-profile-heading">Voice profile</h2></div></div>
          {profile ? <div className="profile-summary"><PenLine size={20} /><div><strong>Version {profile.version}</strong><p>Built from selected writing and approved corrections.</p></div></div> : <EmptyState icon={PenLine} title="No voice profile yet." detail="Selected writing samples will give Harriett a reliable starting point." />}
        </section>
        <section aria-labelledby="writing-samples-heading">
          <div className="section-heading compact"><div><p className="section-kicker">Training material</p><h2 id="writing-samples-heading">Writing samples</h2></div><span className="section-count">{samples?.length ?? 0}</span></div>
          {samples?.length ? <div className="artifact-list">{samples.map((sample) => <details className="artifact-item" key={sample.id}><summary><span><FileText size={17} /><strong>{sample.title ?? `${sample.kind} sample`}</strong></span><span className="status-label">{sample.kind}</span></summary><pre>{sample.content}</pre></details>)}</div> : <EmptyState icon={FileText} title="No writing samples selected." detail="Agent-selected examples and draft corrections will appear here." />}
        </section>
      </div>
    </div>
  );
}
