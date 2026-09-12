import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

export default defineConfig({
  resolve: {
    // Resolve workspace packages to source so tests never depend on a prior build.
    alias: {
      "@kenmark/core": src("./packages/core/src/index.ts"),
      "@kenmark/errors": src("./packages/errors/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
  },
});
