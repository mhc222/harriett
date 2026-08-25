"use client";

import { FileSearch2, FileUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function ContractUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/documents", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Upload failed");
      router.push(`/documents/${payload.documentId}/review`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="contract-upload-shell">
      <button type="button" className="primary-button" onClick={() => setOpen(true)}>
        <FileUp size={17} aria-hidden="true" />
        Review a contract
      </button>
      {open && (
        <div className="review-modal-backdrop" role="presentation" onMouseDown={() => !submitting && setOpen(false)}>
          <section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="review-modal-heading">
              <div>
                <p className="eyebrow">Transaction intake</p>
                <h2 id="upload-title">Review a transaction PDF</h2>
                <p>Harriett will identify the document, extract the facts, keep page evidence, inspect the packet, and build the dates and checklist.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setOpen(false)} disabled={submitting} aria-label="Close upload">
                <X size={19} />
              </button>
            </div>
            <form action={submit} className="review-upload-form">
              <label htmlFor="contract-file">PDF document</label>
              <input ref={inputRef} id="contract-file" name="file" type="file" accept="application/pdf" required disabled={submitting} />
              <p className="field-helper">Maximum 20 MB. The original stays private to the office.</p>
              <div className="automatic-detection-note">
                <FileSearch2 size={19} aria-hidden="true" />
                <div><strong>No document type needed.</strong><p>Harriett reads the pages and identifies the contract, disclosure, addendum, closing document, or combined packet from the document itself.</p></div>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="review-modal-actions">
                <button type="button" className="secondary-button" onClick={() => setOpen(false)} disabled={submitting}>Cancel</button>
                <button type="submit" className="primary-button" disabled={submitting}>
                  {submitting ? "Starting review..." : "Upload and review"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
