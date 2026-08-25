import { CalendarDays, CircleAlert, CircleCheck, Link2, Mail, PlugZap, Unplug } from "lucide-react";
import { z } from "zod";
import { createUserClient } from "@/lib/db/server";
import { googleIntegrationConfigured } from "@/lib/integrations/google";

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
  connected: "Google account connected. Harriett can monitor Gmail, prepare drafts, send approved email, and work with this account's calendars.",
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

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const status = (await searchParams).google;
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
  const googleCapabilities = (googleConnection?.capabilities ?? {}) as Record<string, unknown>;
  const googleConnected = googleConnection?.status === "connected";
  const configured = googleIntegrationConfigured();
  const { data: rawMonitoring } = googleConnection
    ? await db
      .from("provider_subscriptions")
      .select("resource_type, status, expires_at")
      .eq("connection_id", googleConnection.id)
    : { data: [] };
  const parsedMonitoring = z.array(MonitoringStatusSchema).safeParse(rawMonitoring ?? []);
  const monitoring = parsedMonitoring.success ? parsedMonitoring.data : [];
  const monitoringActive = monitoring.some((item) => item.status === "active");
  const otherConnections = connections?.filter((connection) => connection.provider !== "google") ?? [];
  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">Connected systems</p><h1>Connections</h1><p className="page-intro">Provider health, available capabilities, and the last successful synchronization.</p></div></header>
      {status && googleMessages[status] && <p className="connection-notice" role="status">{googleMessages[status]}</p>}
      <section aria-labelledby="connections-heading">
        <div className="section-heading"><div><p className="section-kicker">Integration health</p><h2 id="connections-heading">Systems</h2></div></div>
        <div className="record-list">
          <article className="record-row" key={googleConnection?.id ?? "google"}>
            <span className="record-primary">
              <strong>Google Gmail and Calendar</strong>
              <span>{typeof googleCapabilities.account_email === "string" ? googleCapabilities.account_email : "Connect an individual Google account"}</span>
            </span>
            <span className="record-secondary">
              <span><Mail size={14} /> Inbox monitoring, drafts, and approved sends</span>
              <span><CalendarDays size={14} /> Calendar monitoring and event management</span>
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
