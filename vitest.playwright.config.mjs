import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root,
  test: {
    environment: "node",
    globals: true,
    include: ["packages/**/*.pw.test.ts"],
    testTimeout: 30_000
  }
});
