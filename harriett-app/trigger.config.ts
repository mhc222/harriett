import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_xaifcmclqlqvsljcctnf",
  dirs: ["./trigger"],
  maxDuration: 300,
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
