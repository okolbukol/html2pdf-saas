import { z } from "zod";

const envSchema = z
  .object({
    APP_SECRET: z.string().min(32),
    CLEANUP_BATCH_SIZE: z.coerce.number().int().min(1).max(1_000).default(100),
    CLEANUP_DRY_RUN: z.coerce.boolean().default(true),
    CLEANUP_INTERVAL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(3_600),
    CONVERSION_JOB_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
    CONVERSION_JOB_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(300_000).default(60_000),
    CONVERSION_QUEUE_NAME: z.string().min(1).default("pdf-conversions"),
    CONVERSION_RETENTION_HOURS: z.coerce.number().int().min(1).max(720).default(24),
    CONVERSION_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
    DATABASE_URL: z.string().url(),
    HTML_MAX_BYTES: z.coerce.number().int().min(1_024).max(20_000_000).default(2_000_000),
    HTML_SOURCE_STORAGE_PATH: z.string().min(1).default("./storage/sources"),
    HTML_SOURCE_TTL_SECONDS: z.coerce.number().int().min(60).max(604_800).default(86_400),
    INTERNAL_API_SECRET: z.string().min(32),
    LOCAL_STORAGE_PATH: z.string().min(1).default("./storage"),
    MAX_DOM_CONTENT_BYTES: z.coerce.number().int().min(1_024).max(50_000_000).default(5_000_000),
    MAX_HTML_BYTES: z.coerce.number().int().min(1_024).max(20_000_000).default(2_000_000),
    MAX_NETWORK_BYTES: z.coerce.number().int().min(1_024).max(100_000_000).default(20_000_000),
    MAX_NETWORK_REQUESTS: z.coerce.number().int().min(1).max(1_000).default(100),
    MAX_PDF_BYTES: z.coerce.number().int().min(1_024).max(100_000_000).default(10_000_000),
    MAX_REDIRECTS: z.coerce.number().int().min(0).max(10).default(5),
    MAX_RESOURCE_BYTES: z.coerce.number().int().min(1_024).max(50_000_000).default(5_000_000),
    MAX_TOTAL_NETWORK_BYTES: z.coerce
      .number()
      .int()
      .min(1_024)
      .max(100_000_000)
      .default(20_000_000),
    NAVIGATION_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    OUTPUT_TTL_SECONDS: z.coerce.number().int().min(60).max(2_592_000).default(86_400),
    PDF_GENERATION_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(300_000).default(60_000),
    PDF_MAX_BYTES: z.coerce.number().int().min(1_024).max(100_000_000).default(10_000_000),
    PDF_OUTPUT_STORAGE_PATH: z.string().min(1).default("./storage/outputs"),
    PDF_OUTPUT_TTL_SECONDS: z.coerce.number().int().min(60).max(2_592_000).default(86_400),
    PLAYWRIGHT_JAVASCRIPT_ENABLED: z.coerce.boolean().default(true),
    REDIS_URL: z.string().url(),
    SOURCE_TTL_SECONDS: z.coerce.number().int().min(60).max(604_800).default(86_400),
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
    WORKER_JOB_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(300_000).default(60_000)
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") {
      return;
    }

    for (const key of ["APP_SECRET", "INTERNAL_API_SECRET"] as const) {
      const value = env[key];
      const weak =
        value === "replace-with-at-least-32-characters" ||
        /^(.)(\1){31,}$/.test(value) ||
        value.toLowerCase().includes("replace");

      if (weak) {
        ctx.addIssue({
          code: "custom",
          message: `${key} must be a strong non-default secret in production.`,
          path: [key]
        });
      }
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(input: NodeJS.ProcessEnv): AppEnv {
  return envSchema.parse(input);
}

export function safeParseEnv(input: NodeJS.ProcessEnv) {
  return envSchema.safeParse(input);
}

export function getAppEnv(input: NodeJS.ProcessEnv = process.env): AppEnv {
  return parseEnv(input);
}
