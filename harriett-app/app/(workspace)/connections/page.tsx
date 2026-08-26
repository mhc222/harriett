import { CalendarDays, CircleAlert, CircleCheck, Link2, Mail, PlugZap, Share2, Unplug } from "lucide-react";
import { z } from "zod";
import { createUserClient } from "@/lib/db/server";
import { googleIntegrationConfigured } from "@/lib/integrations/google";
import { metaIntegrationConfigured } from "@/lib/integrations/meta";

export const dynamic = "force-dynamic";

const providerLabels: Record<string, string> = {
  microsoft: "Microsoft 365",
  google: "Google Gmail and Calendar",
  twilio: "Twilio Messaging",
  rentcast: "RentCast",
  meta: "Facebook and Instagram",
  calcom: "Cal.com",
  dotloop: "Dotloop",
  trestle: "MLS Web API",
};

const googleMessages: Record<string, string> = {
  connected: "Google account connected. Harriett can monitor Gmail, prepare drafts, send approved email, manage calendars, and work with Google Contacts.",
  disconnected: "Google account disconnected and its stored credentials were removed.",
  denied: "Google connection was canceled. No account access was stored.",
  invalid_state: "The Google connection request expired. Start the connection again.",
  session_expired: "Your Harriett session expired during Google setup. Sign in and reconnect.",
  not_configured: "Google OAuth still needs its client credentials before agents can connect.",
  callback_failed: "Google could not be connected. Please try again.",
  missing_refresh_token: "Google did not provide long-lived access. Remove Harriett from your Google Account connections, then reconnect.",
  monitoring_queued: "Google monitoring setup is running. New Gmail and Calendar changes will arrive by push notification.",
  monitoring_not_configured: "Google push monitoring still needs its Pub/Sub settings.",
  not_connected: "Connect Google before starting monitoring.",
  monitoring_active: "Google is connected. Gmail and Calendar monitoring are active.",
};

const metaMessages: Record<string, string> = {
  connected: "Facebook connected. The available Page was selected automatically.",
  choose_page: "Facebook connected. Choose the Page Harriett should publish to.",
  page_selected: "Facebook Page selected. Harriett can now prepare posts for your approval.",
  disconnected: "Facebook disconnected and its stored credentials were removed.",
  denied: "Facebook connection was canceled. No account access was stored.",
  invalid_state: "The Facebook connection request expired. Start the connection again.",
  session_expired: "Your Harriett session expired during Facebook setup. Sign in and reconnect.",
  not_configured: "Facebook OAuth still needs its Meta app credentials before agents can connect.",
  no_pages: "Meta did not return a Facebook Page you can publish to. Confirm that you have Page content access, then reconnect.",
  token_expired: "Facebook access expired. Reconnect the account to continue publishing.",
  callback_failed: "Facebook could not be connected. Please try again.",
};

const MonitoringStatusSchema = z.object({
  resource_type: z.string(),
  status: z.string(),
  expires_at: z.string().nullable(),
});

const ConnectionStatusSchema = z.object({
  id: z.string().uuid(),
  provider: z.string(),
  status: z.string(),
  capabilities: z.record(z.string(), z.unknown()).default({}),
  last_synced_at: z.string().nullable(),
  error_message: z.string().nullable(),
  updated_at: z.string(),
});

const MetaPageCapabilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  picture_url: z.string().nullable().optional(),
});

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; meta?: string }>;
}) {
  const params = await searchParams;
  const status = params.google;
  const db = await createUserClient();
  const { data: rawConnections, error: connectionsError } = await db.rpc("get_connection_statuses");
  if (connectionsError) {
    console.error("[connections] failed to load provider status", {
      code: connectionsError.code,
      message: connectionsError.message,
      details: connectionsError.details,
      hint: connectionsError.hint,
    });
  }
  const parsedConnections = z.array(ConnectionStatusSchema).safeParse(rawConnections ?? []);
  const connections = parsedConnections.success ? parsedConnections.data : [];
  const googleConnection = connections?.find((connection) => connection.provider === "google");
  const metaConnection = connections?.find((connection) => connection.provider === "meta");
  const googleCapabilities = (googleConnection?.capabilities ?? {}) as Record<string, unknown>;
  const googleConnected = googleConnection?.status === "connected";
  const configured = googleIntegrationConfigured();
  const metaConfigured = metaIntegrationConfigured();
  const metaCapabilities = (metaConnection?.capabilities ?? {}) as Record<string, unknown>;
  const parsedMetaPages = z.array(MetaPageCapabilitySchema).safeParse(metaCapabilities.pages ?? []);
  const metaPages = parsedMetaPages.success ? parsedMetaPages.data : [];
  const selectedMetaPageId = typeof metaCapabilities.selected_page_id === "string"
    ? metaCapabilities.selected_page_id
    : null;
  const selectedMetaPage = metaPages.find((page) => page.id === selectedMetaPageId);
  const metaConnected = metaConnection?.status === "connected";
  const { data: rawMonitoring } = googleConnection
    ? await db
      .from("provider_subscriptions")
      .select("resource_type, status, expires_at")
      .eq("connection_id", googleConnection.id)
    : { data: [] };
  const parsedMonitoring = z.array(MonitoringStatusSchema).safeParse(rawMonitoring ?? []);
  const monitoring = parsedMonitoring.success ? parsedMonitoring.data : [];
  const activeMonitoringResources = new Set(
    monitoring.filter((item) => item.status === "active").map((item) => item.resource_type)
  );
  const monitoringActive = activeMonitoringResources.has("gmail_inbox")
    && activeMonitoringResources.has("calendar_events");
  const displayedStatus = status === "not_connected" && googleConnected
    ? (monitoringActive ? "monitoring_active" : "monitoring_queued")
    : status;
  const otherConnections = connections?.filter((connection) => !["google", "meta"].includes(connection.provider)) ?? [];
  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">Connected systems</p><h1>Connections</h1><p className="page-intro">Provider health, available capabilities, and the last successful synchronization.</p></div></header>
      {displayedStatus && googleMessages[displayedStatus] && <p className="connection-notice" role="status">{googleMessages[displayedStatus]}</p>}
      {params.meta && metaMessages[params.meta] && <p className="connection-notice" role="status">{metaMessages[params.meta]}</p>}
      <section aria-labelledby="connections-heading">
        <div className="section-heading"><div><p className="section-kicker">Integration health</p><h2 id="connections-heading">Systems</h2></div></div>
        <div className="record-list">
          <article className="record-row connection-record-row" key={googleConnection?.id ?? "google"}>
            <span className="record-primary">
              <strong>Google Gmail and Calendar</strong>
              <span>{typeof googleCapabilities.account_email === "string" ? googleCapabilities.account_email : "Connect an individual Google account"}</span>
            </span>
            <span className="record-secondary">
              <span><Mail size={14} /> Inbox monitoring, drafts, and approved sends</span>
              <span><CalendarDays size={14} /> Calendar monitoring and event management</span>
              <span><Link2 size={14} /> Google Contacts search and management</span>
            </span>
            <span className="connection-controls">
              <span className={`status-label connection-${googleConnection?.status ?? "disconnected"}`}>
                {googleConnected ? <CircleCheck size={12} /> : <PlugZap size={12} />}
                {(googleConnection?.status ?? "disconnected").replaceAll("_", " ")}
              </span>
              {googleConnected ? (
                <>
                  {!monitoringActive && (
                    <form action="/api/integrations/google/monitor" method="post">
                      <button type="submit" className="primary-button"><PlugZap size={16} /> Start monitoring</button>
                    </form>
                  )}
                  <form action="/api/integrations/google/disconnect" method="post">
                    <button type="submit" className="secondary-button"><Unplug size={16} /> Disconnect</button>
                  </form>
                </>
              ) : configured ? (
                <a href="/api/integrations/google/connect" className="primary-button"><Link2 size={16} /> Connect Google</a>
              ) : (
                <button type="button" className="secondary-button" disabled>Setup required</button>
              )}
            </span>
          </article>
          <article className="record-row connection-record-row meta-connection-row" key={metaConnection?.id ?? "meta"}>
            <span className="record-primary">
              <strong>Facebook Page</strong>
              <span>{selectedMetaPage?.name ?? (metaConnected ? "Choose a managed Facebook Page" : "Connect the Facebook account that manages your Page")}</span>
            </span>
            <span className="record-secondary">
              <span><Share2 size={14} /> Agent-reviewed text and link posts</span>
              <span><CircleCheck size={14} /> Publishing is limited to the selected Page</span>
            </span>
            <span className="connection-controls">
              <span className={`status-label connection-${metaConnection?.status ?? "disconnected"}`}>
                {metaConnected ? <CircleCheck size={12} /> : <PlugZap size={12} />}
                {(metaConnection?.status ?? "disconnected").replaceAll("_", " ")}
              </span>
              {metaConnected ? (
                <>
                  {metaPages.length > 1 && (
                    <form action="/api/integrations/meta/select-page" method="post" className="connection-page-form">
                      <label className="sr-only" htmlFor="facebook-page">Facebook Page</label>
                      <select id="facebook-page" name="pageId" defaultValue={selectedMetaPageId ?? ""} required>
                        <option value="" disabled>Choose Page</option>
                        {metaPages.map((page) => <option value={page.id} key={page.id}>{page.name}</option>)}
                      </select>
                      <button type="submit" className="secondary-button">Use Page</button>
                    </form>
                  )}
                  {selectedMetaPage && <a href="/social" className="primary-button"><Share2 size={16} /> Create post</a>}
                  <form action="/api/integrations/meta/disconnect" method="post">
                    <button type="submit" className="secondary-button"><Unplug size={16} /> Disconnect</button>
                  </form>
                </>
              ) : metaConfigured ? (
                <a href="/api/integrations/meta/connect" className="primary-button"><Link2 size={16} /> Connect Facebook</a>
              ) : (
                <button type="button" className="secondary-button" disabled>Setup required</button>
              )}
            </span>
          </article>
          {otherConnections.map((connection) => <article className="record-row" key={connection.id}>
          <span className="record-primary"><strong>{providerLabels[connection.provider] ?? connection.provider}</strong><span>{connection.last_synced_at ? `Last synced ${new Date(connection.last_synced_at).toLocaleString()}` : "Not synchronized yet"}</span></span>
          <span className="record-secondary">{connection.error_message && <span><CircleAlert size={14} />{connection.error_message}</span>}</span>
          <span className={`status-label connection-${connection.status}`}>{connection.status === "connected" ? <CircleCheck size={12} /> : <PlugZap size={12} />}{connection.status.replaceAll("_", " ")}</span>
        </article>)}
        </div>
      </section>
    </div>
  );
}
