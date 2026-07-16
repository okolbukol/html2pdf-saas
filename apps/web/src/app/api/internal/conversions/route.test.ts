import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@html2pdf-pro/config", () => ({
  getAppEnv: () => ({
    APP_SECRET: "a".repeat(32),
    CONVERSION_JOB_ATTEMPTS: 3,
    CONVERSION_JOB_TIMEOUT_MS: 60_000,
    CONVERSION_QUEUE_NAME: "pdf-conversions",
    CONVERSION_RETENTION_HOURS: 24,
    CONVERSION_WORKER_CONCURRENCY: 2,
    DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
    INTERNAL_API_SECRET: "b".repeat(32),
    LOCAL_STORAGE_PATH: "./storage",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NODE_ENV: "test",
    REDIS_URL: "redis://localhost:6379",
    STORAGE_DRIVER: "local"
  })
}));

vi.mock("@html2pdf-pro/database", () => ({
  prisma: {
    conversion: {
      create: vi.fn().mockResolvedValue({ id: "conversion-1", status: "PENDING" }),
      findMany: vi.fn().mockResolvedValue([]),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "conversion-1", status: "QUEUED" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn().mockResolvedValue({ id: "conversion-1", status: "FAILED" })
    }
  }
}));

const deleteSource = vi.fn();
vi.mock("@html2pdf-pro/storage", () => ({
  LocalSourceStorage: class {
    async putHtml() {
      return { key: "00000000-0000-4000-8000-000000000000.html" };
    }
    async delete(key: string) {
      deleteSource(key);
    }
  }
}));

describe("internal conversions endpoint", () => {
  it("rejects requests without the internal secret", async () => {
    const request = new Request("http://localhost/api/internal/conversions", {
      body: JSON.stringify({
        html: "<h1>Hello</h1>",
        options: { fileName: "hello.pdf" },
        sourceType: "HTML"
      }),
      method: "POST"
    });

    const response = await POST(request as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("cleans up source storage when queue enqueue fails", async () => {
    vi.resetModules();
    vi.doMock("@html2pdf-pro/queue", () => ({
      enqueueConversionJob: vi.fn().mockRejectedValue(new Error("redis down"))
    }));
    const { POST: postWithFailingQueue } = await import("./route");
    const request = new Request("http://localhost/api/internal/conversions", {
      body: JSON.stringify({
        html: "<h1>Hello</h1>",
        options: { fileName: "hello.pdf" },
        sourceType: "HTML"
      }),
      headers: { "x-internal-api-secret": "b".repeat(32) },
      method: "POST"
    });

    const response = await postWithFailingQueue(request as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("QUEUE_ENQUEUE_FAILED");
    expect(deleteSource).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000000.html");
  });
});
