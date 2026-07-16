import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "vitest.CMD" : "vitest"
);

const result = spawnSync(
  bin,
  ["run", "--configLoader", "runner", "--config", "vitest.playwright.config.mjs"],
  {
    cwd: root,
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH:
        process.env.PLAYWRIGHT_BROWSERS_PATH ?? path.join(root, ".cache", "ms-playwright")
    },
    shell: process.platform === "win32",
    stdio: "inherit"
  }
);

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
