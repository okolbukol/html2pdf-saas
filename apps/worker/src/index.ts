import { getConversionQueueConfig, createConversionWorker } from "@html2pdf-pro/queue";
import { getAppEnv } from "@html2pdf-pro/config";
import { runCleanup } from "./cleanup";
import { processConversionJob } from "./processor";

const config = getConversionQueueConfig();
const env = getAppEnv();
const worker = createConversionWorker((job) => processConversionJob(job), config);
let shuttingDown = false;
let cleanupRunning = false;

const cleanupTimer = setInterval(() => {
  if (cleanupRunning) {
    return;
  }
  cleanupRunning = true;
  runCleanup()
    .then((report) => {
      console.log("Cleanup completed", report);
    })
    .catch((error: unknown) => {
      console.error("Cleanup failed", error);
    })
    .finally(() => {
      cleanupRunning = false;
    });
}, env.CLEANUP_INTERVAL_SECONDS * 1000);

worker.on("completed", (job) => {
  console.log(`Conversion job completed: ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Conversion job failed: ${job?.id ?? "unknown"}`, error);
});

async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`Worker received ${signal}; waiting for active jobs to finish.`);
  clearInterval(cleanupTimer);
  await worker.close(false);
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

worker.run().catch((error: unknown) => {
  console.error("Worker failed to start", error);
  process.exit(1);
});
