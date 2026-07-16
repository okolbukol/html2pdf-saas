import { runCleanup } from "./cleanup";

if (process.argv.includes("--apply")) {
  process.env.CLEANUP_DRY_RUN = "false";
}

const report = await runCleanup();
console.log(JSON.stringify(report, null, 2));
