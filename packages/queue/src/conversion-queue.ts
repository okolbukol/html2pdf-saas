import { getAppEnv } from "@html2pdf-pro/config";
import {
  assertSafeConversionJobPayload,
  parseConversionJobPayload,
  type ConversionJobPayload
} from "@html2pdf-pro/conversions";
import { JobsOptions, Queue, Worker, type ConnectionOptions, type Processor } from "bullmq";

const conversionUuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ConversionQueueConfig {
  attempts: number;
  concurrency: number;
  jobTimeoutMs: number;
  queueName: string;
  redisUrl: string;
}

export function getConversionQueueConfig(): ConversionQueueConfig {
  const env = getAppEnv();
  return {
    attempts: env.CONVERSION_JOB_ATTEMPTS,
    concurrency: env.WORKER_CONCURRENCY,
    jobTimeoutMs: env.WORKER_JOB_TIMEOUT_MS,
    queueName: env.CONVERSION_QUEUE_NAME,
    redisUrl: env.REDIS_URL
  };
}

export function createRedisConnection(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);
  return {
    db: url.pathname ? Number(url.pathname.slice(1) || 0) : 0,
    host: url.hostname,
    maxRetriesPerRequest: null,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    port: url.port ? Number(url.port) : 6379,
    tls: url.protocol === "rediss:" ? {} : undefined,
    username: url.username ? decodeURIComponent(url.username) : undefined
  };
}

export function createConversionQueue(
  config = getConversionQueueConfig()
): Queue<ConversionJobPayload> {
  return new Queue<ConversionJobPayload>(config.queueName, {
    connection: createRedisConnection(config.redisUrl),
    defaultJobOptions: getDefaultConversionJobOptions(config)
  });
}

export function createConversionWorker(
  processor: Processor<ConversionJobPayload>,
  config = getConversionQueueConfig()
): Worker<ConversionJobPayload> {
  return new Worker<ConversionJobPayload>(config.queueName, processor, {
    autorun: false,
    concurrency: config.concurrency,
    connection: createRedisConnection(config.redisUrl),
    lockDuration: config.jobTimeoutMs,
    maxStalledCount: 1,
    stalledInterval: Math.min(30_000, config.jobTimeoutMs)
  });
}

export async function enqueueConversionJob(
  payload: ConversionJobPayload,
  queue = createConversionQueue(),
  config = getConversionQueueConfig()
) {
  const safePayload = parseConversionJobPayload(payload);
  assertSafeConversionJobPayload(safePayload);

  return queue.add("render-pdf", safePayload, {
    ...getDefaultConversionJobOptions(config),
    jobId: createConversionJobId(safePayload.conversionId)
  });
}

export function createConversionJobId(conversionId: string): string {
  if (!conversionUuidPattern.test(conversionId)) {
    throw new Error("Conversion job id requires a valid conversion UUID");
  }

  return `conversion-${conversionId.toLowerCase()}`;
}

export function getDefaultConversionJobOptions(config: ConversionQueueConfig): JobsOptions {
  return {
    attempts: config.attempts,
    backoff: {
      delay: 2_000,
      type: "exponential"
    },
    removeOnComplete: {
      age: 60 * 60,
      count: 1_000
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60,
      count: 5_000
    }
  };
}
