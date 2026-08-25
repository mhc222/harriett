import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  FileCheck2,
  FileQuestion,
  ShieldCheck,
} from "lucide-react";
import { DealFactEditor } from "@/components/deal-fact-editor";
import { DealFieldsSchema } from "@/lib/contracts/deal";
import { createUserClient } from "@/lib/db/server";
import {
  REVIEW_FIELD_DEFINITIONS,
  REVIEW_FIELD_KEYS,
  derivePacketFacts,
  formatReviewValue,
  type ReviewFieldKey,
} from "@/lib/transaction-review";
import {
  TRANSACTION_DOCUMENT_RULES,
  assessTransactionPacket,
} from "@/lib/transaction-document-rules";

interface EvidenceRow {
  id: string;
  field_name: string;
  value: unknown;
  confidence: number;
  page_number: number | null;
  excerpt: string | null;
  status: string;
  source_type: string;
  correction_reason: string | null;
  created_at: string;
  document_id: string | null;
}

interface ReviewRow {
  id: string;
  document_id: string;
  rule_key: string;
  status: "appears_complete" | "incomplete" | "unreadable" | "needs_review";
  pages: number[];
  missing_or_unclear_items: string[];
  evidence: Array<{ pageNumber: number; quote: string }>;
  confidence: number;
}

const groupOrder = ["Property", "Money", "Dates", "People"] as const;
const statusLabels: Record<string, string> = {
  pre_listing: "Pre-listing",
  listing_active: "Active listing",
  under_contract: "Under contract",
  closing: "Closing",
  closed: "Closed",
  cancelled: "Cancelled",
};

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return "High confidence";
  if (confidence >= 0.7) return "Review advised";
  return "Low confidence";
}

function coarseRuleKey(docType: string): string | null {
  if (docType === "purchase_agreement") return "al_general_financed_purchase_agreement";
  if (docType === "listing_agreement") return "pm_exclusive_right_to_sell_listing_agreement";
  if (docType === "net_sheet") return "al_estimated_closing_statement";
  if (docType === "settlement") return "settlement_statement_or_alta";
  return null;
}

function reviewStatusLabel(status: ReviewRow["status"]): string {
  if (status === "appears_complete") return "Appears complete";
  if (status === "incomplete") return "Incomplete";
  if (status === "unreadable") return "Unreadable";
  return "Needs review";
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export default async function DealReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createUserClient();
  const [dealResult, documentResult, evidenceResult, reviewResult, checklistResult, eventResult] = await Promise.all([
    db.from("deals").select("id, agent_id, address, city, state, zip, county, status, parsed_fields, created_at, updated_at, agents(name)").eq("id", id).single(),
    db.from("documents").select("id, filename, doc_type, document_type_key, parse_status, created_at").eq("deal_id", id).order("created_at"),
    db.from("deal_field_evidence").select("id, field_name, value, confidence, page_number, excerpt, status, source_type, correction_reason, created_at, document_id").eq("deal_id", id).order("created_at", { ascending: false }),
    db.from("document_rule_reviews").select("id, document_id, rule_key, status, pages, missing_or_unclear_items, evidence, confidence").eq("deal_id", id).order("created_at"),
    db.from("checklist_items").select("id, title, detail, due_date, completed, required").eq("deal_id", id).order("due_date", { ascending: true, nullsFirst: false }),
    db.from("calendar_events").select("id, title, date, type").eq("deal_id", id).order("date"),
  ]);
  const deal = dealResult.data;
  if (!deal) notFound();

  const documents = documentResult.data ?? [];
  const evidenceRows = (evidenceResult.data ?? []) as EvidenceRow[];
  const reviewRows = (reviewResult.data ?? []) as ReviewRow[];
  const parsed = DealFieldsSchema.safeParse(deal.parsed_fields);
  const fields = parsed.success ? parsed.data : null;
  const rawFields = (deal.parsed_fields ?? {}) as Record<string, unknown>;
  const currentEvidence = new Map<string, EvidenceRow>();
  for (const row of evidenceRows) {
    if (["rejected", "superseded"].includes(row.status) || currentEvidence.has(row.field_name)) continue;
    currentEvidence.set(row.field_name, row);
  }
  const fileNames = new Map(documents.map((document) => [document.id, document.filename]));

  const explicitKeys = new Set<string>();
  for (const document of documents) {
    if (document.document_type_key) explicitKeys.add(document.document_type_key);
    const mapped = coarseRuleKey(document.doc_type);
    if (mapped) explicitKeys.add(mapped);
  }
  for (const review of reviewRows) explicitKeys.add(review.rule_key);

  const documentTypes = new Set(documents.map((document) => document.doc_type));
  for (const key of explicitKeys) documentTypes.add(key);
  const assessments = fields
    ? assessTransactionPacket(derivePacketFacts(deal.status, fields, documentTypes), explicitKeys)
    : [];
  const relevantAssessments = assessments.filter((item) => item.applicability !== "not_applicable");
  const ruleMap = new Map(TRANSACTION_DOCUMENT_RULES.map((rule) => [rule.key, rule]));
  const reviewByRule = new Map(reviewRows.map((review) => [review.rule_key, review]));
  const missingCount = relevantAssessments.filter((item) => item.applicability === "applies" && !item.present).length;
  const unresolvedCount = relevantAssessments.filter((item) => item.applicability === "needs_facts").length;
  const incompleteCount = reviewRows.filter((item) => item.status !== "appears_complete").length;
  const checklist = checklistResult.data ?? [];
  const events = eventResult.data ?? [];
  const agent = Array.isArray(deal.agents) ? deal.agents[0] : deal.agents;

  return (
    <div className="page-stack transaction-review-page">
      <Link href="/pipeline" className="text-link inline-flex items-center gap-2"><ArrowLeft size={15} /> Back to pipeline</Link>
      <header className="transaction-review-heading">
        <div>
          <p className="eyebrow">Transaction review</p>
          <h1>{deal.address}</h1>
          <p>{[deal.city, deal.state, deal.zip].filter(Boolean).join(", ")} · {agent?.name ?? "Agent not assigned"}</p>
        </div>
        <span className="status-label">{statusLabels[deal.status] ?? deal.status}</span>
      </header>

      {!parsed.success && (
        <div className="review-alert review-alert-danger"><AlertTriangle size={19} /><div><strong>The structured extraction is incomplete.</strong><p>Harriett kept the original file. A person should review it before dates or obligations are used.</p></div></div>
      )}

      <section className="review-scoreboard" aria-label="Transaction review summary">
        <div><span>Facts with evidence</span><strong>{currentEvidence.size}</strong></div>
        <div><span>Missing required forms</span><strong>{missingCount}</strong></div>
        <div><span>Document issues</span><strong>{incompleteCount}</strong></div>
        <div><span>Rules needing facts</span><strong>{unresolvedCount}</strong></div>
      </section>

      <div className="transaction-review-grid">
        <main className="review-main-column">
          <section aria-labelledby="facts-heading">
            <div className="section-heading">
              <div><p className="section-kicker">Source-backed</p><h2 id="facts-heading">Transaction facts</h2></div>
              <span className="review-legend"><ShieldCheck size={15} /> Corrections keep their history</span>
            </div>
            {groupOrder.map((group) => (
              <div className="fact-group" key={group}>
                <h3>{group}</h3>
                <div className="fact-list">
                  {REVIEW_FIELD_KEYS.filter((key) => REVIEW_FIELD_DEFINITIONS[key].group === group).map((fieldName) => {
                    const definition = REVIEW_FIELD_DEFINITIONS[fieldName];
                    const value = rawFields[fieldName];
                    const evidence = currentEvidence.get(fieldName);
                    const corrected = evidence?.source_type === "user_correction";
                    return (
                      <article className={`fact-row ${!evidence ? "fact-row-unverified" : ""}`} key={fieldName}>
                        <div className="fact-label"><span>{definition.label}</span>{corrected && <small>Corrected</small>}</div>
                        <div className="fact-value">
                          <strong>{formatReviewValue(fieldName, value)}</strong>
                          {evidence ? (
                            corrected ? (
                              <p className="fact-source">Confirmed by a user. {evidence.correction_reason}</p>
                            ) : (
                              <details className="evidence-detail">
                                <summary>Page {evidence.page_number ?? "unknown"} · {confidenceLabel(evidence.confidence)}</summary>
                                <blockquote>{evidence.excerpt || "No readable quotation was preserved."}</blockquote>
                                <p>{evidence.document_id ? fileNames.get(evidence.document_id) : "Source document"}</p>
                              </details>
                            )
                          ) : <p className="fact-source fact-source-warning">No page evidence. Verify before relying on this fact.</p>}
                        </div>
                        <DealFactEditor dealId={deal.id} fieldName={fieldName as ReviewFieldKey} value={value} evidenceId={evidence?.id ?? null} />
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          <section aria-labelledby="terms-heading">
            <div className="section-heading"><div><p className="section-kicker">Contract controls</p><h2 id="terms-heading">Conditions and obligations</h2></div><span className="section-count">{fields?.contractTerms.length ?? 0}</span></div>
            {fields?.contractTerms.length ? (
              <div className="term-list">{fields.contractTerms.map((term, index) => (
                <article className="term-row" key={`${term.category}-${term.label}-${index}`}>
                  <div><span className="term-category">{term.category.replaceAll("_", " ")}</span><h3>{term.label}</h3></div>
                  <div><p>{term.value}</p>{term.dueDate && <span className="term-date"><CalendarDays size={14} /> {displayDate(term.dueDate)}</span>}{term.responsibleParty && <small>Responsible: {term.responsibleParty}</small>}</div>
                  <details className="evidence-detail"><summary>{term.pageNumber ? `Page ${term.pageNumber}` : "No readable page evidence"} · {confidenceLabel(term.confidence)}</summary><blockquote>{term.quote ?? "This term needs human review because no readable quotation was preserved."}</blockquote></details>
                </article>
              ))}</div>
            ) : <div className="quiet-state"><CircleHelp size={21} /><p>No material conditions were extracted. Review the original document before assuming none apply.</p></div>}
          </section>
        </main>

        <aside className="review-side-column">
          <section aria-labelledby="packet-heading">
            <div className="section-heading compact"><div><p className="section-kicker">Alabama packet</p><h2 id="packet-heading">Document check</h2></div></div>
            <p className="review-explainer">Presence and execution are separate. “Appears complete” is Harriett’s review, not broker or legal approval.</p>
            {relevantAssessments.length ? (
              <div className="packet-list">{relevantAssessments.map((assessment) => {
                const review = reviewByRule.get(assessment.documentKey);
                const rule = ruleMap.get(assessment.documentKey);
                const status = review
                  ? review.status
                  : assessment.applicability === "needs_facts" ? "needs_facts"
                    : assessment.present ? "needs_review" : "missing";
                return (
                  <article className={`packet-row packet-${status}`} key={assessment.documentKey}>
                    <span className="packet-icon">{status === "appears_complete" ? <CheckCircle2 size={17} /> : status === "missing" || status === "incomplete" ? <AlertTriangle size={17} /> : status === "unreadable" ? <FileQuestion size={17} /> : <FileCheck2 size={17} />}</span>
                    <div>
                      <span className="packet-status">{status === "missing" ? "Missing" : status === "needs_facts" ? "Need transaction facts" : reviewStatusLabel(status as ReviewRow["status"])}</span>
                      <h3>{assessment.title}</h3>
                      <p>{review?.missing_or_unclear_items?.length ? review.missing_or_unclear_items.join("; ") : assessment.reason}</p>
                      {review?.pages?.length ? <small>Pages {review.pages.join(", ")} · {Math.round(review.confidence * 100)}% confidence</small> : null}
                      {rule?.humanReviewNotes[0] && <details><summary>Review note</summary><p>{rule.humanReviewNotes[0]}</p></details>}
                    </div>
                  </article>
                );
              })}</div>
            ) : <div className="quiet-state compact"><FileQuestion size={20} /><p>Packet rules will appear after structured extraction succeeds.</p></div>}
          </section>

          <section aria-labelledby="documents-heading">
            <div className="section-heading compact"><div><p className="section-kicker">Original files</p><h2 id="documents-heading">Documents</h2></div><span className="section-count">{documents.length}</span></div>
            <div className="compact-list">{documents.map((document) => (
              <div className="compact-row" key={document.id}><span className="work-icon"><FileCheck2 size={16} /></span><span><span className="work-title">{document.filename}</span><span className="work-meta">{document.parse_status === "parsed" ? "Indexed and reviewed" : document.parse_status}</span></span></div>
            ))}</div>
          </section>

          <section aria-labelledby="work-heading">
            <div className="section-heading compact"><div><p className="section-kicker">Generated work</p><h2 id="work-heading">Checklist and dates</h2></div></div>
            <div className="review-work-summary"><div><strong>{checklist.filter((item) => !item.completed).length}</strong><span>open checklist items</span></div><div><strong>{events.length}</strong><span>calendar dates</span></div></div>
            {events.slice(0, 4).map((event) => <div className="review-date-row" key={event.id}><span>{displayDate(event.date)}</span><strong>{event.title}</strong></div>)}
          </section>
        </aside>
      </div>
    </div>
  );
}
