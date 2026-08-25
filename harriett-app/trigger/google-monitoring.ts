import { randomBytes, randomUUID } from "node:crypto";
import { schedules, schemaTask, tasks } from "@trigger.dev/sdk";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { getConnectedGoogleAccessTokenById } from "@/lib/connections/google";
import { PostgresUuidSchema } from "@/lib/contracts/scalars";
import { createServiceClient } from "@/lib/db/server";
import {
  googleMailMatchesRecipients,
  hashGoogleChannelToken,
  monitoredGmailQuery,
  monitoredGmailRecipients,
  normalizeGoogleMailMetadata,
} from "@/lib/google-monitoring";
import {
  getGoogleMessageMetadata,
  listGoogleCalendarEventChanges,
  listGoogleInboxMessages,
  listGoogleMailboxHistory,
  stopGoogleCalendarChannel,
  watchGoogleCalendar,
  watchGoogleMailbox,
  GoogleIntegrationError,
} from "@/lib/integrations/google";

const ConnectionSchema = z.object({
  id: PostgresUuidSchema,
  office_id: PostgresUuidSchema,
  agent_id: PostgresUuidSchema,
  capabilities: z.record(z.string(), z.unknown()),
});

async function connectionContext(connectionId: string) {
  const db = createServiceClient();
  const { data, error } = await db
    .from("connections")
    .select("id, office_id, agent_id, capabilities")
    .eq("id", connectionId)
    .eq("provider", "google")
    .eq("status", "connected")
    .single();
  if (error || !data) throw new Error(`connected Google account not found: ${error?.message}`);
  return { db, connection: ConnectionSchema.parse(data) };
}

async function upsertMailMessages(input: {
  connectionId: string;
  messageIds: string[];
}) {
  const { db, connection } = await connectionContext(input.connectionId);
  const accessToken = await getConnectedGoogleAccessTokenById(db, connection.id);
  const allowedRecipients = monitoredGmailRecipients(process.env.GOOGLE_GMAIL_MONITORED_TO);
  let changed = 0;
  let ignored = 0;
  for (const messageId of [...new Set(input.messageIds)]) {
    const metadata = await getGoogleMessageMetadata({ accessToken, messageId });
    if (!metadata.labelIds.includes("INBOX")) continue;
    if (!googleMailMatchesRecipients(metadata, allowedRecipients)) {
      ignored += 1;
      continue;
    }
    const row = {
      office_id: connection.office_id,
      agent_id: connection.agent_id,
      connection_id: connection.id,
      ...normalizeGoogleMailMetadata(metadata),
    };
    const { error } = await db
      .from("google_mail_index")
      .upsert(row, { onConflict: "connection_id,gmail_message_id" });
    if (error) throw new Error(`Gmail index write failed: ${error.message}`);
    changed += 1;
  }
  return { db, connection, accessToken, changed, ignored };
}

export const syncGoogleMailbox = schemaTask({
  id: "sync-google-mailbox",
  schema: z.object({
    connectionId: PostgresUuidSchema,
    notificationHistoryId: z.string().regex(/^\d+$/).optional(),
    bootstrap: z.boolean().default(false),
  }),
  run: async (input) => {
    const { db, connection } = await connectionContext(input.connectionId);
    const { data: subscription, error: subscriptionError } = await db
      .from("provider_subscriptions")
      .select("id, cursor")
      .eq("connection_id", connection.id)
      .eq("resource_type", "gmail_inbox")
      .eq("external_resource_id", "INBOX")
      .maybeSingle();
    if (subscriptionError) throw new Error(`Gmail subscription lookup failed: ${subscriptionError.message}`);

    let changed = 0;
    let ignored = 0;
    let cursor = subscription?.cursor ?? null;
    if (input.bootstrap || !cursor) {
      const accessToken = await getConnectedGoogleAccessTokenById(db, connection.id);
      const allowedRecipients = monitoredGmailRecipients(process.env.GOOGLE_GMAIL_MONITORED_TO);
      const inbox = await listGoogleInboxMessages({
        accessToken,
        query: monitoredGmailQuery(allowedRecipients),
        maxResults: 50,
      });
      const result = await upsertMailMessages({
        connectionId: connection.id,
        messageIds: inbox.messages.map((message) => message.id),
      });
      changed = result.changed;
      ignored = result.ignored;
      cursor = input.notificationHistoryId ?? cursor;
    } else {
      const accessToken = await getConnectedGoogleAccessTokenById(db, connection.id);
      const messageIds: string[] = [];
      let pageToken: string | undefined;
      try {
        do {
          const history = await listGoogleMailboxHistory({
            accessToken,
            startHistoryId: cursor,
            pageToken,
          });
          for (const record of history.history) {
            for (const addition of record.messagesAdded) messageIds.push(addition.message.id);
          }
          cursor = history.historyId;
          pageToken = history.nextPageToken;
        } while (pageToken);
        const result = await upsertMailMessages({ connectionId: connection.id, messageIds });
        changed = result.changed;
        ignored = result.ignored;
      } catch (error) {
        if (!(error instanceof GoogleIntegrationError) || error.status !== 404) throw error;
        const allowedRecipients = monitoredGmailRecipients(process.env.GOOGLE_GMAIL_MONITORED_TO);
        const inbox = await listGoogleInboxMessages({
          accessToken,
          query: monitoredGmailQuery(allowedRecipients),
          maxResults: 50,
        });
        const result = await upsertMailMessages({
          connectionId: connection.id,
          messageIds: inbox.messages.map((message) => message.id),
        });
        changed = result.changed;
        ignored = result.ignored;
        cursor = input.notificationHistoryId ?? cursor;
      }
    }

    const now = new Date().toISOString();
    const { error: updateError } = await db
      .from("provider_subscriptions")
      .update({ cursor: cursor ?? input.notificationHistoryId, last_notification_at: now, updated_at: now })
      .eq("connection_id", connection.id)
      .eq("resource_type", "gmail_inbox")
      .eq("external_resource_id", "INBOX");
    if (updateError) throw new Error(`Gmail cursor update failed: ${updateError.message}`);
    const { error: connectionError } = await db
      .from("connections")
      .update({ last_synced_at: now, error_code: null, error_message: null, updated_at: now })
      .eq("id", connection.id);
    if (connectionError) throw new Error(`Google connection sync timestamp failed: ${connectionError.message}`);

    await writeAudit(db, {
      officeId: connection.office_id,
      actor: "system",
      agentId: connection.agent_id,
      action: "google.gmail_synced",
      payload: { connectionId: connection.id, changed, ignored, cursor, bootstrap: input.bootstrap },
    });
    return { changed, ignored, cursor };
  },
});

export const syncGoogleCalendar = schemaTask({
  id: "sync-google-calendar",
  schema: z.object({ connectionId: PostgresUuidSchema, calendarId: z.string().min(1).default("primary") }),
  run: async ({ connectionId, calendarId }) => {
    const { db, connection } = await connectionContext(connectionId);
    const accessToken = await getConnectedGoogleAccessTokenById(db, connection.id);
    const { data: subscription, error: subscriptionError } = await db
      .from("provider_subscriptions")
      .select("cursor")
      .eq("connection_id", connection.id)
      .eq("resource_type", "calendar_events")
      .eq("external_resource_id", calendarId)
      .maybeSingle();
    if (subscriptionError) throw new Error(`Calendar subscription lookup failed: ${subscriptionError.message}`);

    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;
    let syncToken = subscription?.cursor ?? undefined;
    let changed = 0;
    while (true) {
      let result;
      try {
        result = await listGoogleCalendarEventChanges({
          accessToken,
          calendarId,
          syncToken,
          pageToken,
        });
      } catch (error) {
        if (!(error instanceof GoogleIntegrationError) || error.status !== 410 || !syncToken) throw error;
        syncToken = undefined;
        pageToken = undefined;
        continue;
      }
      const now = new Date().toISOString();
      const rows = result.items.map((event) => ({
        office_id: connection.office_id,
        agent_id: connection.agent_id,
        connection_id: connection.id,
        calendar_id: calendarId,
        google_event_id: event.id,
        status: event.status ?? null,
        summary: event.summary,
        location: event.location ?? null,
        starts_at: event.start.dateTime ?? null,
        ends_at: event.end.dateTime ?? null,
        all_day_start: event.start.date ?? null,
        all_day_end: event.end.date ?? null,
        source_url: event.htmlLink ?? null,
        organizer_email: event.organizer?.email ?? null,
        attendee_emails: event.attendees.flatMap((attendee) => attendee.email ? [attendee.email] : []),
        google_updated_at: event.updated ?? null,
        last_observed_at: now,
        updated_at: now,
      }));
      if (rows.length) {
        const { error } = await db
          .from("google_calendar_event_index")
          .upsert(rows, { onConflict: "connection_id,calendar_id,google_event_id" });
        if (error) throw new Error(`Calendar index write failed: ${error.message}`);
        changed += rows.length;
      }
      pageToken = result.nextPageToken;
      nextSyncToken = result.nextSyncToken ?? nextSyncToken;
      if (!pageToken) break;
    }

    const now = new Date().toISOString();
    const { error: cursorError } = await db
      .from("provider_subscriptions")
      .update({ cursor: nextSyncToken ?? subscription?.cursor, last_notification_at: now, updated_at: now })
      .eq("connection_id", connection.id)
      .eq("resource_type", "calendar_events")
      .eq("external_resource_id", calendarId);
    if (cursorError) throw new Error(`Calendar cursor update failed: ${cursorError.message}`);
    await writeAudit(db, {
      officeId: connection.office_id,
      actor: "system",
      agentId: connection.agent_id,
      action: "google.calendar_synced",
      payload: { connectionId: connection.id, calendarId, changed },
    });
    return { changed, cursor: nextSyncToken ?? subscription?.cursor };
  },
});

export const configureGoogleMonitoring = schemaTask({
  id: "configure-google-monitoring",
  schema: z.object({ connectionId: PostgresUuidSchema }),
  run: async ({ connectionId }) => {
    const { db, connection } = await connectionContext(connectionId);
    const accessToken = await getConnectedGoogleAccessTokenById(db, connection.id);
    const topicName = z.string().min(1).parse(process.env.GOOGLE_GMAIL_PUBSUB_TOPIC);
    const appUrl = z.string().url().parse(process.env.NEXT_PUBLIC_APP_URL).replace(/\/$/, "");

    const { data: existingGmail, error: existingGmailError } = await db
      .from("provider_subscriptions")
      .select("cursor")
      .eq("connection_id", connection.id)
      .eq("resource_type", "gmail_inbox")
      .eq("external_resource_id", "INBOX")
      .maybeSingle();
    if (existingGmailError) throw new Error(`Gmail watch lookup failed: ${existingGmailError.message}`);
    const { data: existingCalendar, error: existingCalendarError } = await db
      .from("provider_subscriptions")
      .select("cursor, provider_subscription_id, provider_resource_id")
      .eq("connection_id", connection.id)
      .eq("resource_type", "calendar_events")
      .eq("external_resource_id", "primary")
      .maybeSingle();
    if (existingCalendarError) throw new Error(`Calendar watch lookup failed: ${existingCalendarError.message}`);

    const gmailWatch = await watchGoogleMailbox({ accessToken, topicName });
    const gmailExpiresAt = new Date(Number(gmailWatch.expiration)).toISOString();
    const { error: gmailError } = await db.from("provider_subscriptions").upsert({
      office_id: connection.office_id,
      agent_id: connection.agent_id,
      connection_id: connection.id,
      provider: "google",
      resource_type: "gmail_inbox",
      external_resource_id: "INBOX",
      cursor: existingGmail?.cursor ?? gmailWatch.historyId,
      expires_at: gmailExpiresAt,
      status: "active",
      error_code: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "connection_id,resource_type,external_resource_id" });
    if (gmailError) throw new Error(`Gmail watch save failed: ${gmailError.message}`);

    const channelId = randomUUID();
    const channelToken = randomBytes(32).toString("base64url");
    const requestedExpiration = Date.now() + 6 * 24 * 60 * 60 * 1000;
    const calendarWatch = await watchGoogleCalendar({
      accessToken,
      calendarId: "primary",
      channelId,
      webhookUrl: `${appUrl}/api/webhooks/google/calendar`,
      verificationToken: channelToken,
      expiration: requestedExpiration,
    });
    const calendarExpiresAt = new Date(Number(calendarWatch.expiration ?? requestedExpiration)).toISOString();
    const { error: calendarError } = await db.from("provider_subscriptions").upsert({
      office_id: connection.office_id,
      agent_id: connection.agent_id,
      connection_id: connection.id,
      provider: "google",
      resource_type: "calendar_events",
      external_resource_id: "primary",
      provider_subscription_id: calendarWatch.id,
      provider_resource_id: calendarWatch.resourceId,
      verification_token_hash: hashGoogleChannelToken(channelToken),
      cursor: existingCalendar?.cursor ?? null,
      expires_at: calendarExpiresAt,
      status: "active",
      error_code: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "connection_id,resource_type,external_resource_id" });
    if (calendarError) throw new Error(`Calendar watch save failed: ${calendarError.message}`);

    if (existingCalendar?.provider_subscription_id && existingCalendar.provider_resource_id) {
      await stopGoogleCalendarChannel({
        accessToken,
        channelId: existingCalendar.provider_subscription_id,
        resourceId: existingCalendar.provider_resource_id,
      }).catch(() => undefined);
    }

    if (!existingGmail) {
      await tasks.trigger<typeof syncGoogleMailbox>(
        "sync-google-mailbox",
        { connectionId: connection.id, notificationHistoryId: gmailWatch.historyId, bootstrap: true },
        { idempotencyKey: ["gmail-bootstrap", connection.id, gmailWatch.historyId], idempotencyKeyTTL: "1d" }
      );
    }
    if (!existingCalendar) {
      await tasks.trigger<typeof syncGoogleCalendar>(
        "sync-google-calendar",
        { connectionId: connection.id, calendarId: "primary" },
        { idempotencyKey: ["calendar-bootstrap", connection.id, channelId], idempotencyKeyTTL: "1d" }
      );
    }
    await writeAudit(db, {
      officeId: connection.office_id,
      actor: "system",
      agentId: connection.agent_id,
      action: "google.monitoring_configured",
      payload: { connectionId: connection.id, gmailExpiresAt, calendarExpiresAt },
    });
    return { gmailExpiresAt, calendarExpiresAt };
  },
});

export const renewGoogleMonitoring = schedules.task({
  id: "renew-google-monitoring",
  cron: { pattern: "15 10 * * *", timezone: "America/Chicago", environments: ["PRODUCTION"] },
  run: async () => {
    const db = createServiceClient();
    const renewBefore = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const { data, error } = await db
      .from("provider_subscriptions")
      .select("connection_id")
      .eq("provider", "google")
      .eq("status", "active")
      .lte("expires_at", renewBefore);
    if (error) throw new Error(`Google renewal lookup failed: ${error.message}`);
    const connectionIds = [...new Set((data ?? []).map((row) => z.string().uuid().parse(row.connection_id)))];
    for (const connectionId of connectionIds) {
      await tasks.trigger<typeof configureGoogleMonitoring>(
        "configure-google-monitoring",
        { connectionId },
        { idempotencyKey: ["google-renewal", connectionId, new Date().toISOString().slice(0, 10)], idempotencyKeyTTL: "1d" }
      );
    }
    return { queued: connectionIds.length };
  },
});
