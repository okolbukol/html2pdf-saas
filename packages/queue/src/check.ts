import { createConversionQueue, getConversionQueueConfig } from "./conversion-queue";

const config = getConversionQueueConfig();
const queue = createConversionQueue(config);

try {
  const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
  console.log(JSON.stringify({ queue: config.queueName, counts }, null, 2));
} finally {
  await queue.close();
}
