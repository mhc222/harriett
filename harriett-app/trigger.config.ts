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
          "TWILIO_SEND_ENABLED",
          "MEMORY_MODE",
          "MEM0_TELEMETRY",
          "MEM0_LLM_MODEL",
        ]
          .filter((name) => process.env[name])
          .map((name) => ({ name, value: process.env[name]! })),
        ...["OPENAI_API_KEY"]
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
