"use client";

import { AlertTriangle, FileSearch2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function DocumentProcessingStatus({ documentId, initialStatus }: { documentId: string; initialStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "failed") return;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Could not check the review");
        if (cancelled) return;
        setStatus(payload.status);
        if (payload.dealId) {
          router.replace(`/deals/${payload.dealId}`);
          router.refresh();
        }
      } catch (pollError) {
        if (!cancelled) setError(pollError instanceof Error ? pollError.message : "Could not check the review");
      }
    };
    void poll();
    const interval = window.setInterval(poll, 3_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [documentId, router, status]);

  if (status === "failed" || error) {
    return (
      <div className="processing-state processing-error">
        <AlertTriangle size={24} aria-hidden="true" />
        <div><h2>The review needs attention</h2><p>{error ?? "Harriett could not finish reading this PDF. The original document is still saved."}</p></div>
      </div>
    );
  }

  return (
    <div className="processing-state" aria-live="polite">
      <span className="processing-icon"><FileSearch2 size={27} aria-hidden="true" /></span>
      <div>
        <h2>Harriett is reading the transaction</h2>
        <p>Extracting facts, checking page evidence, reviewing forms, and building the transaction work.</p>
        <div className="processing-track"><span /></div>
      </div>
    </div>
  );
}
