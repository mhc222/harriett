"use client";

import { Check, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  REVIEW_FIELD_DEFINITIONS,
  correctionInputValue,
  type ReviewFieldKey,
} from "@/lib/transaction-review";

interface DealFactEditorProps {
  dealId: string;
  fieldName: ReviewFieldKey;
  value: unknown;
  evidenceId: string | null;
}

export function DealFactEditor({ dealId, fieldName, value, evidenceId }: DealFactEditorProps) {
  const router = useRouter();
  const definition = REVIEW_FIELD_DEFINITIONS[fieldName];
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(correctionInputValue(fieldName, value));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/deals/${dealId}/facts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldName, value: input, reason, supersedesEvidenceId: evidenceId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Correction could not be saved");
      setEditing(false);
      setReason("");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Correction could not be saved");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button type="button" className="fact-edit-button" onClick={() => setEditing(true)} aria-label={`Correct ${definition.label}`}>
        <Pencil size={14} aria-hidden="true" /> Correct
      </button>
    );
  }

  const inputType = definition.input === "date" ? "date" : definition.input === "number" ? "text" : "text";
  return (
    <div className="fact-editor">
      <label htmlFor={`fact-${fieldName}`}>Corrected value</label>
      {definition.input === "list" ? (
        <textarea id={`fact-${fieldName}`} value={input} onChange={(event) => setInput(event.target.value)} rows={2} disabled={saving} />
      ) : (
        <input id={`fact-${fieldName}`} type={inputType} inputMode={definition.input === "number" ? "decimal" : undefined} value={input} onChange={(event) => setInput(event.target.value)} disabled={saving} />
      )}
      <label htmlFor={`reason-${fieldName}`}>Why is this being corrected?</label>
      <input id={`reason-${fieldName}`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Example: Confirmed on signed page 8" disabled={saving} />
      <p className="field-helper">The original extraction remains in the history.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="fact-editor-actions">
        <button type="button" className="secondary-button" onClick={() => setEditing(false)} disabled={saving}><X size={15} /> Cancel</button>
        <button type="button" className="primary-button" onClick={save} disabled={saving || reason.trim().length < 3}><Check size={15} /> {saving ? "Saving..." : "Save correction"}</button>
      </div>
    </div>
  );
}
