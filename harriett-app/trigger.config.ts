import { defineConfig } from "@trigger.dev/sdk";
import { syncEnvVars } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "proj_jjyiwhswhllwvwicxxvn",
  dirs: ["./trigger"],
  maxDuration: 300,
  build: {
    // Mem0 exposes many optional providers through one package entry point.
    // Keep it external so Trigger installs the package at runtime instead of
    // trying to bundle providers Harriett does not use.
    external: ["mem0ai", "@supabase/supabase-js"],
    extensions: [
      // Operational switches remain visible. Provider credentials are synced
      // as redacted secrets and never included in task payloads or logs.
      syncEnvVars(() => [
        ...[
          "SMS_DELIVERY_MODE",
          "WHATSAPP_DELIVERY_MODE",
          "TWILIO_SEND_ENABLED",
          "TWILIO_ACCOUNT_SID",
          "TWILIO_WHATSAPP_FROM",
          "TWILIO_WHATSAPP_STATUS_CALLBACK_URL",
          "RENTCAST_ENABLED",
          "BRIGHT_DATA_ENABLED",
          "BRIGHT_DATA_ZILLOW_DATASET_ID",
          "MEMORY_MODE",
          "MEM0_TELEMETRY",
          "MEM0_LLM_MODEL",
          "GOOGLE_OAUTH_CLIENT_ID",
          "GOOGLE_OAUTH_REDIRECT_URI",
          "GOOGLE_GMAIL_PUBSUB_TOPIC",
        ]
          .filter((name) => process.env[name])
          .map((name) => ({ name, value: process.env[name]! })),
        ...[
          "ANTHROPIC_API_KEY",
          "OPENAI_API_KEY",
          "NEXT_PUBLIC_SUPABASE_URL",
          "NEXT_PUBLIC_SUPABASE_ANON_KEY",
          "NEXT_PUBLIC_APP_URL",
          "SUPABASE_SERVICE_ROLE_KEY",
          "TWILIO_AUTH_TOKEN",
          "RENTCAST_API_KEY",
          "BRIGHT_DATA_API_KEY",
          "GOOGLE_OAUTH_CLIENT_SECRET",
          "CONNECTION_ENCRYPTION_KEY",
        ]
          .filter((name) => process.env[name])
          .map((name) => ({ name, value: process.env[name]!, isSecret: true })),
      ]),
    ],
  },
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
      factor: 2,
    },
  },
});
