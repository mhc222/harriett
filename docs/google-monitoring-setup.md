# Google pilot monitoring setup

This pilot uses Google push notifications. Harriett does not poll Gmail every minute.

## Data boundary

Gmail and Google Calendar remain the source of truth. Harriett stores only the operational index needed for Today, search, classification, urgency, and durable synchronization.

Stored Gmail fields:

- Gmail message and thread IDs
- sender, recipients, subject, and a short Gmail snippet
- labels, received time, category, priority, and attention status
- a link back to Gmail

Full email bodies and attachments stay in Gmail. Harriett fetches a full message only when the agent asks a question that cannot be answered from the index. Raw inbox content is never written to personal memory.

Stored Calendar fields:

- Google event ID and calendar ID
- title, time, location, status, organizer, and attendee email addresses
- a link back to Google Calendar

## Google Cloud setup

Use the same Google Cloud project that owns the OAuth client.

1. Enable the Gmail API, Google Calendar API, and Cloud Pub/Sub API.
2. Confirm the OAuth consent screen includes Matt's Google account as a test user.
3. Confirm the Web OAuth client includes this callback exactly:

   `https://harriett-app.vercel.app/api/integrations/google/callback`

4. Create a Pub/Sub topic named `harriett-gmail`.
5. On that topic, grant `Pub/Sub Publisher` to:

   `gmail-api-push@system.gserviceaccount.com`

6. Create a user-managed service account named `harriett-pubsub-push`.
7. Create a Pub/Sub push subscription on the `harriett-gmail` topic:

   - Delivery type: Push
   - Endpoint: `https://harriett-app.vercel.app/api/webhooks/google/gmail`
   - Enable authentication: Yes
   - Service account: `harriett-pubsub-push`
   - Audience: `https://harriett-app.vercel.app/api/webhooks/google/gmail`

8. Grant the Pub/Sub service agent for the project permission to mint the authenticated push token. Google documents this as the Service Account Token Creator role for:

   `service-PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com`

## Required production environment variables

Configure these in Vercel:

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REDIRECT_URI=https://harriett-app.vercel.app/api/integrations/google/callback
CONNECTION_ENCRYPTION_KEY
GOOGLE_GMAIL_PUBSUB_TOPIC=projects/PROJECT_ID/topics/harriett-gmail
GOOGLE_GMAIL_MONITORED_TO=
GOOGLE_PUBSUB_AUDIENCE=https://harriett-app.vercel.app/api/webhooks/google/gmail
GOOGLE_PUBSUB_SERVICE_ACCOUNT=harriett-pubsub-push@PROJECT_ID.iam.gserviceaccount.com
NEXT_PUBLIC_APP_URL=https://harriett-app.vercel.app
```

The Trigger.dev deployment also needs the OAuth client, encryption key, Pub/Sub topic, and app URL. `trigger.config.ts` synchronizes those values from the deployment environment.

For a personal Gmail test account, set `GOOGLE_GMAIL_MONITORED_TO` to a dedicated
plus alias such as `name+harriett@gmail.com`. Harriett ignores and does not index
mail addressed anywhere else. Leave it empty only when the connected mailbox is
dedicated to real estate work.

## Activate the account

1. Apply Supabase migration `0024_google_monitoring.sql`.
2. Deploy Vercel and Trigger.dev.
3. Sign in to Harriett and open Connections.
4. Connect the Google account, or click Start monitoring if it is already connected.
5. Send a test email to the connected Gmail account and create or edit a Calendar event.
6. Confirm both changes appear on Today without waiting for a polling interval.

Gmail watches expire within seven days. Harriett renews expiring watches daily at 10:15 AM America/Chicago. This is a maintenance request, not mailbox polling. Calendar channels are renewed through the same task.

Google OAuth apps left in Testing can issue refresh tokens that expire after seven days for non-basic scopes. Reconnect weekly during the earliest pilot, or move the consent configuration through the appropriate Google production and verification process before relying on unattended monitoring.

## Security checks

- Gmail Pub/Sub requests must carry a Google-signed OIDC token with the configured audience and service-account email.
- Calendar notifications must match the stored channel ID, resource ID, and hashed channel token.
- Webhooks only validate and enqueue. Trigger.dev performs the API synchronization.
- Every notification, sync, configuration action, and tool read is written to Harriett's audit or skill-run trail.
- Disconnecting Google deletes the stored credentials, subscriptions, and compact indexes.
