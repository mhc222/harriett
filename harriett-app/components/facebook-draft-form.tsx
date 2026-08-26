"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface DealOption {
  id: string;
  label: string;
}

interface FacebookDraftFormProps {
  connected: boolean;
  deals: DealOption[];
}

const draftSteps = [
  "Opening the transaction record",
  "Checking the official Pritchett-Moore listing",
  "Reviewing property facts and listing attribution",
  "Writing Facebook-ready copy",
  "Preparing the Facebook preview",
];

export function FacebookDraftForm({ connected, deals }: FacebookDraftFormProps) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!working) return;
    const interval = window.setInterval(() => {
      setActiveStep((current) => Math.min(current + 1, draftSteps.length - 1));
    }, 1_350);
    return () => window.clearInterval(interval);
  }, [working]);

  async function generateDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setActiveStep(0);
    setError(null);
    try {
      const response = await fetch("/api/social/facebook/drafts", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(event.currentTarget),
      });
      const result = await response.json().catch(() => null) as { artifactId?: string; error?: string } | null;
      if (!response.ok || !result?.artifactId) {
        throw new Error(result?.error ?? "Harriett could not create the draft.");
      }
      router.push(`/social?draft=${encodeURIComponent(result.artifactId)}&created=1`);
      router.refresh();
    } catch (caught) {
      setWorking(false);
      setError(caught instanceof Error ? caught.message : "Harriett could not create the draft.");
    }
  }

  return (
    <>
      <form onSubmit={generateDraft} className="social-form" aria-busy={working}>
        <fieldset className="social-form-fields" disabled={working}>
          <label htmlFor="post-type">Post type</label>
          <select id="post-type" name="postType" required defaultValue="new_listing">
            <option value="new_listing">New listing</option>
            <option value="under_contract">Under contract</option>
            <option value="just_sold">Just sold</option>
            <option value="open_house">Open house</option>
            <option value="market_update">Market update</option>
            <option value="custom">Custom</option>
          </select>
          <label htmlFor="share-mode">Post presentation</label>
          <select id="share-mode" name="shareMode" required defaultValue="link_preview">
            <option value="link_preview">Official listing link</option>
            <option value="listing_photo">Primary listing photo</option>
            <option value="text_only">Text only (market updates and custom posts)</option>
          </select>
          <label htmlFor="deal-id">Transaction</label>
          <select id="deal-id" name="dealId" defaultValue="">
            <option value="">No transaction</option>
            {deals.map((deal) => <option value={deal.id} key={deal.id}>{deal.label}</option>)}
          </select>
          <label htmlFor="social-notes">Direction for Harriett</label>
          <textarea id="social-notes" name="notes" rows={5} maxLength={2000} placeholder="What should Harriett emphasize? Add any special call to action, tone, emoji, or hashtag direction." />
          <p className="form-helper">Property posts use the verified Pritchett-Moore page saved with the listing. Photo posts use its primary image and include the official link in the reviewed copy.</p>
          <button type="submit" className="primary-button" disabled={!connected || working}>
            {working ? "Harriett is creating the draft" : "Generate Facebook draft"}
          </button>
        </fieldset>
      </form>
      {working && <HarriettWorkStatus title="Harriett is creating your post" steps={draftSteps} activeStep={activeStep} />}
      {error && <p className="connection-notice form-error" role="alert">{error}</p>}
    </>
  );
}

export function HarriettWorkStatus({
  title,
  steps,
  activeStep,
}: {
  title: string;
  steps: string[];
  activeStep: number;
}) {
  return (
    <section className="harriett-work-status" aria-live="polite" aria-label={title} aria-busy="true">
      <div className="harriett-work-panel">
        <header>
          <span className="harriett-working-orb" aria-hidden="true"><i /></span>
          <span><strong>{title}</strong><small>{steps[activeStep]}</small></span>
        </header>
        <ol>
          {steps.map((step, index) => (
            <li className={index < activeStep ? "complete" : index === activeStep ? "active" : "queued"} key={step}>
              <span aria-hidden="true">{index < activeStep ? "✓" : index + 1}</span>
              <small>{step}</small>
            </li>
          ))}
        </ol>
        <p>Keep this window open. Harriett will continue automatically.</p>
      </div>
    </section>
  );
}
