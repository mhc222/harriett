"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function WorkItemStatus({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  async function update(nextStatus: "in_progress" | "completed") {
    setSaving(true);
    const response = await fetch(`/api/work-items/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setSaving(false);
    if (response.ok) router.refresh();
  }
  if (saving) return <span className="work-status-busy"><LoaderCircle size={16} className="spin" /> Saving</span>;
  return <span className="work-row-actions">{status === "open" && <button type="button" className="text-button" onClick={() => update("in_progress")}>Start</button>}<button type="button" className="text-button" onClick={() => update("completed")}><Check size={14} /> Done</button></span>;
}
