import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Point file tracing at the monorepo root so Next picks up hoisted deps.
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
