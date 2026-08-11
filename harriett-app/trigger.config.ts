import { defineConfig } from "@trigger.dev/sdk";
import { syncEnvVars } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "proj_xaifcmclqlqvsljcctnf",
  dirs: ["./trigger"],
  maxDuration: 300,
  build: {
    extensions: [
      // Deploy-time env sync from the local .env so the dashboard never has
      // to be hand-edited. Values live in .env(.local), never in this file.
      syncEnvVars(() =>
        ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY"]
          .filter((name) => process.env[name])
          .map((name) => ({ name, value: process.env[name]! }))
      ),
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
