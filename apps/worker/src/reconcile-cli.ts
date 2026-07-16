import { runReconciliation } from "./reconcile";

if (process.argv.includes("--apply")) {
  process.env.CLEANUP_DRY_RUN = "false";
}

const report = await runReconciliation();
console.log(JSON.stringify(report, null, 2));
