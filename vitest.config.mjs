import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root,
  test: {
    coverage: {
      reporter: ["text", "html"]
    },
    environment: "jsdom",
    exclude: ["**/node_modules/**", "**/.next/**", "**/*.pw.test.ts"],
    globals: true,
    include: ["apps/**/*.test.{ts,tsx}", "packages/**/*.test.ts"],
    setupFiles: ["vitest.setup.ts"]
  }
});
