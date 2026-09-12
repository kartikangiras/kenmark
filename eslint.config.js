// @ts-check
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // apps/web is linted by its own Next-aware config (npm run lint -w @kenmark/web).
    ignores: ["**/dist/**", "**/node_modules/**", "**/.next/**", "apps/web/**"],
  },
  ...tseslint.configs.recommended,
);
