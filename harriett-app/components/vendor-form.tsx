"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus } from "lucide-react";

const VENDOR_TYPES = [
  "Photographer",
  "Inspector",
  "Title company",
  "Appraiser",
  "Lender",
  "Attorney",
  "Repair contractor",
  "Other",
];

export function VendorForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setWorking(true);
    setError(null);
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.get("type"),
          name: form.get("name"),
          contact: form.get("contact") || undefined,
          phone: form.get("phone") || undefined,
          email: form.get("email") || undefined,
          notes: form.get("notes") || undefined,
          preferred: form.get("preferred") === "on",
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The vendor could not be saved.");
      formElement.reset();
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The vendor could not be saved.");
    } finally {
      setWorking(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="primary-button" onClick={() => setOpen(true)}>
        <Plus size={17} aria-hidden="true" /> Add vendor
      </button>
    );
  }

  return (
    <form className="record-form" onSubmit={submit}>
      <div className="record-form-grid">
        <label>Vendor type<select name="type" required defaultValue=""><option value="" disabled>Select type</option>{VENDOR_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label>Company or vendor name<input name="name" required maxLength={160} /></label>
        <label>Contact person<input name="contact" maxLength={160} /></label>
        <label>Phone<input name="phone" type="tel" maxLength={40} /></label>
        <label>Email<input name="email" type="email" maxLength={200} /></label>
        <label className="record-form-wide">Notes<textarea name="notes" rows={3} maxLength={2000} /></label>
      </div>
      <label className="checkbox-label"><input name="preferred" type="checkbox" /> Preferred vendor</label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={working}>
          {working && <LoaderCircle className="animate-spin" size={17} />}{working ? "Saving vendor..." : "Save vendor"}
        </button>
        <button type="button" className="secondary-button" onClick={() => setOpen(false)}>Keep directory</button>
      </div>
    </form>
  );
}
