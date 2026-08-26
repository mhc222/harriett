"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface FacebookDraftReviewProps {
  artifactId: string;
  initialMessage: string;
  pageName: string;
  pagePictureUrl: string | null;
  title: string;
  shareMode: "link_preview" | "listing_photo" | "text_only";
  publicListingUrl: string | null;
  primaryImageUrl: string | null;
  factCheckNotes: string[];
  complianceNotes: string[];
  connected: boolean;
  publishStatus: string;
  publishError?: string | null;
}

export function FacebookDraftReview(props: FacebookDraftReviewProps) {
  const [message, setMessage] = useState(props.initialMessage);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();
  const pageInitial = props.pageName.trim().charAt(0).toUpperCase() || "P";
  const hasListingImage = Boolean(props.primaryImageUrl);
  const posting = props.publishStatus === "publishing";
  const published = props.publishStatus === "published";
  const deleting = props.publishStatus === "deleting";
  const deleted = props.publishStatus === "deleted";
  const busy = posting || deleting || submitting;

  async function publishPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/social/facebook/propose", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(event.currentTarget),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Facebook publishing could not be started");
      router.replace(`/social?view=history&posting=1&draft=${encodeURIComponent(props.artifactId)}`);
      router.refresh();
    } catch (error) {
      setSubmitting(false);
      setSubmitError(error instanceof Error ? error.message : "Facebook publishing could not be started");
    }
  }

  useEffect(() => {
    if (!busy) return;
    const interval = window.setInterval(() => router.refresh(), 2_500);
    return () => window.clearInterval(interval);
  }, [busy, router]);

  return (
    <div className="facebook-review-layout">
      <form onSubmit={publishPost} className="social-form facebook-editor-form">
        <input type="hidden" name="artifactId" value={props.artifactId} />
        <label htmlFor="facebook-message">Post copy</label>
        <textarea
          id="facebook-message"
          name="message"
          rows={14}
          maxLength={63206}
          required
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <label htmlFor="facebook-link">
          {props.publicListingUrl ? "Official property link" : "Optional public link"}
        </label>
        <input
          id="facebook-link"
          name="link"
          type="url"
          inputMode="url"
          placeholder="https://example.com/listing"
          defaultValue={props.publicListingUrl ?? ""}
          readOnly={Boolean(props.publicListingUrl)}
        />
        <p className="form-helper">
          {props.shareMode === "listing_photo"
            ? "Facebook will publish the verified primary listing photo. The official property URL is included in the caption."
            : props.shareMode === "link_preview"
              ? "Facebook will attach the official property page as the link preview."
              : "This text-only post will not attach listing media."}
        </p>
        {props.factCheckNotes.length > 0 && (
          <div className="social-fact-check">
            <strong>Confirm before publishing</strong>
            <ul>{props.factCheckNotes.map((note) => <li key={note}>{note}</li>)}</ul>
          </div>
        )}
        {props.complianceNotes.length > 0 && (
          <details className="social-compliance-notes">
            <summary>Harriett&apos;s advertising checks</summary>
            <ul>{props.complianceNotes.map((note) => <li key={note}>{note}</li>)}</ul>
          </details>
        )}
        <div className="social-publish-step">
          <span>1</span>
          <p><strong>This is the exact post approval.</strong><small>Clicking below sends this preview directly to the selected Facebook Page.</small></p>
        </div>
        <button type="submit" className="primary-button" disabled={!props.connected || busy || published || deleted}>
          {deleted
            ? "Deleted from Facebook"
            : deleting
              ? "Deleting from Facebook..."
              : published
                ? "Posted to Facebook"
                : posting || submitting
                  ? "Posting to Facebook..."
                  : "Post to Facebook"}
        </button>
        {props.publishStatus === "failed" && (
          <p className="form-error" role="alert">Facebook did not publish this post. The draft is safe to retry.</p>
        )}
        {submitError && <p className="form-error" role="alert">{submitError}</p>}
      </form>

      <aside className="facebook-preview-column" aria-label="Facebook post preview">
        <div className="facebook-preview-label">
          <span>Facebook preview</span>
          <small>Close representation of the Page post</small>
        </div>
        <article className="facebook-post-preview">
          <header className="facebook-post-header">
            <span
              className="facebook-page-avatar"
              aria-hidden="true"
              style={props.pagePictureUrl ? { backgroundImage: `url(${props.pagePictureUrl})` } : undefined}
            >{props.pagePictureUrl ? "" : pageInitial}</span>
            <span><strong>{props.pageName}</strong><small>Just now · Public</small></span>
            <span className="facebook-more" aria-hidden="true">•••</span>
          </header>
          <p className="facebook-post-copy">{message || "Your Facebook post copy will appear here as you type."}</p>
          {props.shareMode === "listing_photo" && hasListingImage && (
            <div
              className="facebook-post-photo"
              role="img"
              aria-label={`Primary listing photo for ${props.title}`}
              style={{ backgroundImage: `url(${props.primaryImageUrl})` }}
            />
          )}
          {props.shareMode === "link_preview" && props.publicListingUrl && (
            <a className="facebook-link-preview" href={props.publicListingUrl} target="_blank" rel="noreferrer">
              {hasListingImage && (
                <span
                  className="facebook-link-image"
                  role="img"
                  aria-label={`Listing preview for ${props.title}`}
                  style={{ backgroundImage: `url(${props.primaryImageUrl})` }}
                />
              )}
              <span className="facebook-link-copy">
                <small>PRITCHETT-MOORE.COM</small>
                <strong>{props.title}</strong>
                <span>View property details, photos, price, and current listing information.</span>
              </span>
            </a>
          )}
          <footer className="facebook-post-footer" aria-hidden="true">
            <span>Like</span><span>Comment</span><span>Share</span>
          </footer>
        </article>
        <p className="facebook-preview-disclaimer">Facebook may crop the image or shorten link text differently by device.</p>
      </aside>
    </div>
  );
}
