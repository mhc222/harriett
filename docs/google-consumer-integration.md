# Google Consumer Account Integration

Harriett connects each agent's personal Google account through OAuth 2.0. The agent signs in on Google's domain and grants access directly. Harriett never requests, receives, or stores a Google password.

## Initial capabilities

- Monitor Gmail inbox changes
- Read the message metadata needed to identify and route work
- Create Gmail drafts
- Send email after Harriett's existing approval gate
- List the agent's calendars
- Read and monitor calendar events
- Create calendar events after the configured approval gate
- Disconnect and revoke the account from Harriett

The initial OAuth scopes are:

```text
openid
email
profile
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/calendar.calendarlist.readonly
```

`gmail.modify` is a restricted Google scope. It is necessary for background inbox monitoring and draft creation. Public production use requires Google's restricted-scope verification process. If restricted Gmail data passes through or is stored on Harriett's servers, Google may require an annual security assessment.

## Google Cloud setup

Use the existing Harriett Google Cloud project.

1. Enable the Gmail API.
2. Enable the Google Calendar API.
3. Enable the Pub/Sub API for Gmail push notifications.
4. Open Google Auth Platform and configure the app audience as External.
5. Add the initial closed-beta users as test users.
6. Add the scopes listed above under Data Access.
7. Create an OAuth client with application type Web application.
8. Add this authorized production redirect URI:

```text
https://harriett-app.vercel.app/api/integrations/google/callback
```

9. For local testing, also add:

```text
http://localhost:3000/api/integrations/google/callback
```

10. Add the OAuth client ID and secret to Vercel. Never put the client secret in a browser variable or committed file.

## Closed-beta limitation

An External app in Testing can have up to 100 listed test users. Because Harriett requests Gmail and Calendar scopes, test-user grants and refresh tokens expire after seven days. Agents will need to reconnect weekly until the OAuth app is moved to production and verified.

## Gmail push setup

Gmail push notifications use Google Cloud Pub/Sub rather than posting directly to Harriett.

1. Create a Pub/Sub topic in the Harriett project.
2. Grant publish permission on that topic to `gmail-api-push@system.gserviceaccount.com`.
3. Create a push subscription whose HTTPS endpoint is Harriett's Gmail notification webhook.
4. Store the topic name as `GOOGLE_GMAIL_PUBSUB_TOPIC`.
5. Renew each Gmail mailbox watch at least every seven days. Daily renewal is preferred.

Calendar push notifications use watch channels and a direct HTTPS webhook. Channel IDs, expiration, and resource IDs must be stored per agent so they can be renewed and stopped safely.

## Security model

- OAuth state is checked against a short-lived, HTTP-only cookie.
- Access and refresh tokens are encrypted with AES-256-GCM before storage.
- The encryption key is server-only.
- Browser sessions can access only their own connection metadata through RLS.
- Encrypted secrets have no direct browser table policy.
- Connect and disconnect actions write to Harriett's audit log.
- Consumer-facing sends remain subject to broker approval regardless of provider.
