import { CircleAlert, CircleCheck, FileText, Share2 } from "lucide-react";
import Link from "next/link";
import { z } from "zod";
import { EmptyState } from "@/components/empty-state";
import { FacebookDeleteButton } from "@/components/facebook-delete-button";
import { FacebookDiscardButton } from "@/components/facebook-discard-button";
import { FacebookDraftForm } from "@/components/facebook-draft-form";
import { FacebookDraftReview } from "@/components/facebook-draft-review";
import { SocialStatusRefresh } from "@/components/social-status-refresh";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";

export const dynamic = "force-dynamic";

const ConnectionSchema = z.object({
  provider: z.string(),
  status: z.string(),
  capabilities: z.record(z.string(), z.unknown()).default({}),
});

const ArtifactContentSchema = z.object({
  fact_check_notes: z.array(z.string()).default([]),
  compliance_notes: z.array(z.string()).default([]),
  publish_status: z.string().optional(),
  page_name: z.string().optional(),
  external_permalink: z.string().url().nullable().optional(),
  external_post_id: z.string().optional(),
  share_mode: z.enum(["link_preview", "listing_photo", "text_only"]).optional(),
  public_listing_url: z.string().url().nullable().optional(),
  primary_image_url: z.string().url().nullable().optional(),
  publish_error: z.string().nullable().optional(),
}).passthrough();

const FacebookActionSchema = z.object({
  status: z.string(),
  exact_payload: z.record(z.string(), z.unknown()),
});

export default async function SocialPage({
  searchParams,
}: {
  searchParams: Promise<{
    draft?: string;
    created?: string;
    posting?: string;
    published?: string;
    deleting?: string;
    deleted?: string;
    removed?: string;
    view?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return null;
  const [{ data: rawConnections }, { data: deals }, { data: artifacts }, { data: rawFacebookActions }] = await Promise.all([
    db.rpc("get_connection_statuses"),
    db.from("deals")
      .select("id,address,city,status,list_price,sale_price")
      .eq("agent_id", auth.agentId)
      .neq("status", "cancelled")
      .order("updated_at", { ascending: false })
      .limit(100),
    db.from("artifacts")
      .select("id,title,status,plain_text,content,created_at,updated_at")
      .eq("agent_id", auth.agentId)
      .eq("kind", "social_post")
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(20),
    db.from("action_requests")
      .select("status,exact_payload")
      .eq("agent_id", auth.agentId)
      .in("skill_name", ["facebook_publish_post", "facebook_delete_post"])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const parsedConnections = z.array(ConnectionSchema).safeParse(rawConnections ?? []);
  const meta = parsedConnections.success
    ? parsedConnections.data.find((connection) => connection.provider === "meta")
    : undefined;
  const selectedPageId = typeof meta?.capabilities.selected_page_id === "string"
    ? meta.capabilities.selected_page_id
    : null;
  const pageOptions = z.array(z.object({
    id: z.string(),
    name: z.string(),
    picture_url: z.string().url().nullable().optional(),
  })).safeParse(meta?.capabilities.pages ?? []);
  const selectedPage = pageOptions.success
    ? pageOptions.data.find((page) => page.id === selectedPageId)
    : undefined;
  const connected = meta?.status === "connected" && Boolean(selectedPage);
  const activeDraft = artifacts?.find((artifact) => artifact.id === params.draft) ?? null;
  const activeContent = ArtifactContentSchema.safeParse(activeDraft?.content);
  const facebookActions = z.array(FacebookActionSchema).safeParse(rawFacebookActions ?? []);
  const activeAction = facebookActions.success && activeDraft
    ? facebookActions.data.find((action) => action.exact_payload.artifactId === activeDraft.id)
    : undefined;
  const storedPublishStatus = activeContent.success
    ? activeContent.data.publish_status ?? activeDraft?.status ?? "draft"
    : activeDraft?.status ?? "draft";
  const activePublishStatus = storedPublishStatus === "publishing" && activeAction?.status === "failed"
    ? "failed"
    : storedPublishStatus;
  const reviewCandidate = activeDraft ?? artifacts?.find((artifact) => {
    const content = ArtifactContentSchema.safeParse(artifact.content);
    return !content.success || !["published", "deleted"].includes(content.data.publish_status ?? "draft");
  }) ?? null;
  const activeView = params.view === "history" ? "history" : activeDraft ? "review" : "create";

  return (
    <div className="page-stack">
      <SocialStatusRefresh
        active={["publishing", "deleting"].includes(activePublishStatus)}
        actionStatus={activeAction?.status}
        operation={activePublishStatus === "deleting" ? "deleting" : "publishing"}
      />
      <header className="page-heading">
        <div>
          <p className="eyebrow">Agent marketing</p>
          <h1>Facebook</h1>
          <p className="page-intro">Generate Facebook-ready copy with relevant hashtags and restrained emojis, see how it will look, then approve the exact post.</p>
        </div>
      </header>

      {params.created && <p className="connection-notice" role="status">Draft created. Confirm the facts and edit the copy before requesting publication.</p>}
      {params.posting && activePublishStatus === "publishing" && <p className="connection-notice" role="status">Posting to Facebook now. This page will update when Meta confirms it.</p>}
      {params.posting && activePublishStatus === "failed" && <p className="connection-notice form-error" role="alert">Facebook did not publish the post. The draft is unchanged and ready to retry.</p>}
      {params.published && <p className="connection-notice" role="status">Posted to Facebook. The published post is saved in Recent work below.</p>}
      {params.deleting && <p className="connection-notice" role="status">Deleting the post from Facebook now.</p>}
      {params.deleted && <p className="connection-notice" role="status">Deleted from Facebook. Harriett retained an archived audit record.</p>}
      {params.removed && <p className="connection-notice" role="status">Draft deleted. Harriett retained the audit record.</p>}
      {params.error && <p className="connection-notice form-error" role="alert">{params.error}</p>}

      <section className="social-connection-bar" aria-label="Facebook connection status">
        <span>
          {connected ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
          <strong>{connected ? selectedPage?.name : "Facebook Page is not ready"}</strong>
          <small>{connected ? "Connected for agent-approved publishing" : "Connect Facebook and choose a Page before creating posts"}</small>
        </span>
        {!connected && <Link href="/connections" className="primary-button">Connect Facebook</Link>}
      </section>

      <nav className="social-wizard-nav" aria-label="Facebook post workflow">
        <Link href="/social" className={activeView === "create" ? "active" : ""} aria-current={activeView === "create" ? "step" : undefined}>
          <span>1</span><strong>Create</strong><small>Choose the post</small>
        </Link>
        {reviewCandidate ? (
          <Link href={`/social?draft=${reviewCandidate.id}`} className={activeView === "review" ? "active" : ""} aria-current={activeView === "review" ? "step" : undefined}>
            <span>2</span><strong>Review and post</strong><small>See the Facebook preview</small>
          </Link>
        ) : (
          <span className="disabled"><span>2</span><strong>Review and post</strong><small>Create a draft first</small></span>
        )}
        <Link href="/social?view=history" className={activeView === "history" ? "active" : ""} aria-current={activeView === "history" ? "step" : undefined}>
          <span>3</span><strong>Recent posts</strong><small>Open or delete posts</small>
        </Link>
      </nav>

      {activeView === "create" && (
        <section className="social-stage social-create-stage" aria-labelledby="generate-social-heading">
          <div className="section-heading compact">
            <div><p className="section-kicker">Step 1</p><h2 id="generate-social-heading">Generate draft</h2></div>
            <Link href="/social?view=history" className="text-link">View recent posts</Link>
          </div>
          <FacebookDraftForm
            connected={connected}
            deals={(deals ?? []).map((deal) => ({
              id: deal.id,
              label: `${deal.address}, ${deal.city} (${deal.status.replaceAll("_", " ")})`,
            }))}
          />
        </section>
      )}

      {activeView === "review" && activeDraft && (
        <section className="social-stage social-review-stage" aria-labelledby="review-social-heading">
          <div className="section-heading compact">
            <div><p className="section-kicker">Step 2</p><h2 id="review-social-heading">Review and approve</h2></div>
            <span className="social-stage-actions"><Link href="/social" className="secondary-button">Start another post</Link><Link href="/social?view=history" className="secondary-button">Recent posts</Link></span>
          </div>
          <FacebookDraftReview
            artifactId={activeDraft.id}
            initialMessage={activeDraft.plain_text ?? ""}
            pageName={selectedPage?.name ?? "Selected Facebook Page"}
            pagePictureUrl={selectedPage?.picture_url ?? null}
            title={activeDraft.title}
            shareMode={activeContent.success ? activeContent.data.share_mode ?? "text_only" : "text_only"}
            publicListingUrl={activeContent.success ? activeContent.data.public_listing_url ?? null : null}
            primaryImageUrl={activeContent.success ? activeContent.data.primary_image_url ?? null : null}
            factCheckNotes={activeContent.success ? activeContent.data.fact_check_notes : []}
            complianceNotes={activeContent.success ? activeContent.data.compliance_notes : []}
            connected={connected}
            publishStatus={activePublishStatus}
            publishError={activeContent.success ? activeContent.data.publish_error ?? null : null}
          />
        </section>
      )}

      {activeView === "history" && <section className="social-stage social-history-stage" aria-labelledby="social-history-heading">
        <div className="section-heading">
          <div><p className="section-kicker">Step 3</p><h2 id="social-history-heading">Facebook drafts and posts</h2></div>
          <span className="section-count">{artifacts?.length ?? 0}</span>
        </div>
        {artifacts?.length ? (
          <div className="artifact-list">
            {artifacts.map((artifact) => {
              const content = ArtifactContentSchema.safeParse(artifact.content);
              const storedStatus = content.success ? content.data.publish_status ?? artifact.status : artifact.status;
              const relatedAction = facebookActions.success
                ? facebookActions.data.find((action) => action.exact_payload.artifactId === artifact.id)
                : undefined;
              const effectiveStatus = storedStatus === "publishing" && relatedAction?.status === "failed"
                ? "failed"
                : storedStatus;
              return (
                <details className="artifact-item" key={artifact.id} open={artifact.id === activeDraft?.id}>
                  <summary>
                    <span><FileText size={17} /><strong>{artifact.title}</strong></span>
                    <span className="status-label">{effectiveStatus.replaceAll("_", " ")}</span>
                  </summary>
                  <div className="social-artifact-body">
                    <pre>{artifact.plain_text}</pre>
                    <span className="social-artifact-actions">
                      <Link href={`/social?draft=${artifact.id}`} className="secondary-button">Open draft</Link>
                      {content.success && content.data.external_permalink && (
                        <a href={content.data.external_permalink} target="_blank" rel="noreferrer" className="secondary-button">View on Facebook</a>
                      )}
                      {content.success && effectiveStatus === "published" && content.data.external_post_id && (
                        <FacebookDeleteButton artifactId={artifact.id} pageName={content.data.page_name ?? "Facebook"} deleting={false} />
                      )}
                      {content.success && effectiveStatus === "deleting" && (
                        <FacebookDeleteButton artifactId={artifact.id} pageName={content.data.page_name ?? "Facebook"} deleting />
                      )}
                      {!(["published", "deleting", "publishing"].includes(effectiveStatus)) && (
                        <FacebookDiscardButton artifactId={artifact.id} />
                      )}
                    </span>
                  </div>
                </details>
              );
            })}
          </div>
        ) : <EmptyState icon={Share2} title="No Facebook drafts yet." detail="Create the first draft from a verified transaction or your own notes." />}
      </section>}
    </div>
  );
}
