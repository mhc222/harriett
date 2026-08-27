"use client";

import { Camera, FilePenLine, Megaphone } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DealWorkflow } from "@/lib/contracts/operations";

const choices: Array<{ workflow: DealWorkflow; title: string; detail: string; icon: typeof Camera }> = [
  { workflow: "marketing_materials", title: "Marketing materials", detail: "Draft a verified-facts listing package.", icon: Megaphone },
  { workflow: "photo_coordination", title: "Photo coordination", detail: "Build the readiness, vendor, and scheduling plan.", icon: Camera },
  { workflow: "document_drafting", title: "Document draft", detail: "Prepare an internal transaction document for review.", icon: FilePenLine },
];

export function DealWorkflowPanel({ dealId }: { dealId: string }) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<DealWorkflow>("marketing_materials");
  const [brief, setBrief] = useState("");
  const [documentType, setDocumentType] = useState("transaction_summary");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function start() {
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/deal-workflows", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workflow, dealId, brief, documentType: workflow === "document_drafting" ? documentType : undefined }),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setSaving(false);
    if (!response.ok) return setMessage(result.error || "The workflow could not be started.");
    setMessage("Started. The draft and its follow-up work will appear here when ready.");
    setBrief("");
    router.refresh();
  }

  return (
    <div className="deal-workflow-panel">
      <div className="workflow-choice-grid">
        {choices.map((choice) => {
          const Icon = choice.icon;
          return <button type="button" key={choice.workflow} className={`workflow-choice ${workflow === choice.workflow ? "workflow-choice-active" : ""}`} onClick={() => setWorkflow(choice.workflow)}><Icon size={19} /><span><strong>{choice.title}</strong><small>{choice.detail}</small></span></button>;
        })}
      </div>
      {workflow === "document_drafting" && <label><span>Document type</span><select value={documentType} onChange={(event) => setDocumentType(event.target.value)}><option value="transaction_summary">Transaction summary</option><option value="vendor_brief">Vendor brief</option><option value="broker_review_memo">Broker review memo</option><option value="custom">Custom internal document</option></select></label>}
      <label><span>Instructions or context</span><textarea rows={4} maxLength={4000} value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Optional details, priorities, or facts that need special attention" /></label>
      {message && <p className="form-message" role="status">{message}</p>}
      <button type="button" className="primary-button" onClick={start} disabled={saving}>{saving ? "Starting..." : "Start workflow"}</button>
    </div>
  );
}
