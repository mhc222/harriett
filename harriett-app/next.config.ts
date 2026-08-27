import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mem0 exposes many optional provider adapters. Keep it as a server runtime
  // dependency so Turbopack does not try to resolve adapters Harriett does not use.
  serverExternalPackages: ["mem0ai"],
};

export default nextConfig;
