import type { NextConfig } from "next";
import path from "node:path";

const validationReports = ["../../validation/test-results/**/*"];

const nextConfig: NextConfig = {
  // Point file tracing at the monorepo root so Next picks up hoisted deps.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // The dashboard reads the markdown reports from disk at request time, so
  // the serverless bundle has to carry them.
  outputFileTracingIncludes: {
    "/dashboard": validationReports,
    "/dashboard/**/*": validationReports,
  },
};

export default nextConfig;
