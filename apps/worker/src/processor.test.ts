import { ConversionDomainError } from "@html2pdf-pro/conversions";
import { describe, expect, it, vi } from "vitest";
import { processConversionJob } from "./processor";

const env = {
  APP_SECRET: "a".repeat(32),
  CLEANUP_BATCH_SIZE: 100,
  CLEANUP_DRY_RUN: true,
  CLEANUP_INTERVAL_SECONDS: 3_600,
  CONVERSION_JOB_ATTEMPTS: 3,
  CONVERSION_JOB_TIMEOUT_MS: 60_000,
  CONVERSION_QUEUE_NAME: "pdf-conversions",
  CONVERSION_RETENTION_HOURS: 24,
  CONVERSION_WORKER_CONCURRENCY: 2,
  DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
  HTML_MAX_BYTES: 1_000_000,
  HTML_SOURCE_STORAGE_PATH: "./storage/sources",
  HTML_SOURCE_TTL_SECONDS: 86_400,
  INTERNAL_API_SECRET: "b".repeat(32),
  LOCAL_STORAGE_PATH: "./storage",
  MAX_DOM_CONTENT_BYTES: 1_000_000,
  MAX_HTML_BYTES: 1_000_000,
  MAX_NETWORK_BYTES: 1_000_000,
  MAX_NETWORK_REQUESTS: 20,
  MAX_PDF_BYTES: 1_000_000,
  MAX_REDIRECTS: 3,
  MAX_RESOURCE_BYTES: 500_000,
  MAX_TOTAL_NETWORK_BYTES: 1_000_000,
  NAVIGATION_TIMEOUT_MS: 5_000,
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NODE_ENV: "test" as const,
  OUTPUT_TTL_SECONDS: 86_400,
  PDF_GENERATION_TIMEOUT_MS: 5_000,
  PDF_MAX_BYTES: 1_000_000,
  PDF_OUTPUT_STORAGE_PATH: "./storage/outputs",
  PDF_OUTPUT_TTL_SECONDS: 86_400,
  PLAYWRIGHT_JAVASCRIPT_ENABLED: true,
  REDIS_URL: "redis://localhost:6379",
  SOURCE_TTL_SECONDS: 86_400,
  STORAGE_DRIVER: "local" as const,
  WORKER_CONCURRENCY: 2,
  WORKER_JOB_TIMEOUT_MS: 60_000
};

describe("conversion worker processor", () => {
  it("does not process terminal conversions again", async () => {
    const updateMany = vi.fn();
    const prismaClient = {
      $transaction: vi.fn(),
      conversion: {
        findUnique: vi.fn().mockResolvedValue({
          id: "c1",
          options: { fileName: "x.pdf" },
          status: "COMPLETED"
        }),
        update: vi.fn(),
        updateMany
      },
      conversionFile: { create: vi.fn() }
    };

    await processConversionJob(
      {
        attemptsMade: 0,
        data: {
          conversionId: "c1",
          normalizedOptions: { fileName: "x.pdf" },
          sourceReference: "https://public.example",
          sourceType: "URL"
        },
        opts: { attempts: 3 }
      } as never,
      { env, prismaClient: prismaClient as never, render: vi.fn() }
    );

    expect(updateMany).not.toHaveBeenCalled();
  });

  it("keeps HTML source when a retryable non-final attempt fails", async () => {
    const deleteSource = vi.fn();
    const prismaClient = {
      $transaction: vi.fn(),
      conversion: {
        findUnique: vi.fn().mockResolvedValue({
          expiresAt: new Date(Date.now() + 1000),
          id: "c1",
          options: { fileName: "x.pdf" },
          sourceHtmlStorageKey: "source.html",
          status: "QUEUED"
        }),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 })
      },
      conversionFile: { create: vi.fn() }
    };

    await expect(
      processConversionJob(
        {
          attemptsMade: 0,
          data: {
            conversionId: "c1",
            normalizedOptions: { fileName: "x.pdf" },
            sourceReference: "00000000-0000-4000-8000-000000000000.html",
            sourceType: "HTML"
          },
          opts: { attempts: 3 }
        } as never,
        {
          env,
          prismaClient: prismaClient as never,
          render: vi.fn().mockRejectedValue(new ConversionDomainError("PDF_GENERATION_FAILED")),
          sourceStorage: {
            delete: deleteSource,
            getHtml: vi.fn().mockResolvedValue("<h1>x</h1>")
          } as never
        }
      )
    ).rejects.toMatchObject({ code: "PDF_GENERATION_FAILED" });

    expect(deleteSource).not.toHaveBeenCalled();
    expect(prismaClient.conversion.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "QUEUED" }) })
    );
  });

  it("deletes HTML source on final failure", async () => {
    const deleteSource = vi.fn();
    const prismaClient = {
      $transaction: vi.fn(),
      conversion: {
        findUnique: vi.fn().mockResolvedValue({
          expiresAt: new Date(Date.now() + 1000),
          id: "c1",
          options: { fileName: "x.pdf" },
          status: "QUEUED"
        }),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 })
      },
      conversionFile: { create: vi.fn() }
    };

    await expect(
      processConversionJob(
        {
          attemptsMade: 2,
          data: {
            conversionId: "c1",
            normalizedOptions: { fileName: "x.pdf" },
            sourceReference: "00000000-0000-4000-8000-000000000000.html",
            sourceType: "HTML"
          },
          opts: { attempts: 3 }
        } as never,
        {
          env,
          prismaClient: prismaClient as never,
          render: vi.fn().mockRejectedValue(new ConversionDomainError("PDF_GENERATION_FAILED")),
          sourceStorage: {
            delete: deleteSource,
            getHtml: vi.fn().mockResolvedValue("<h1>x</h1>")
          } as never
        }
      )
    ).rejects.toMatchObject({ code: "PDF_GENERATION_FAILED" });

    expect(deleteSource).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000000.html");
    expect(prismaClient.conversion.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) })
    );
  });

  it("deletes output storage when database completion fails", async () => {
    const deleteOutput = vi.fn();
    const prismaClient = {
      $transaction: vi.fn().mockRejectedValue(new Error("db down")),
      conversion: {
        findUnique: vi.fn().mockResolvedValue({
          expiresAt: new Date(Date.now() + 1000),
          id: "c1",
          options: { fileName: "x.pdf" },
          status: "QUEUED"
        }),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 })
      },
      conversionFile: { create: vi.fn() }
    };

    await expect(
      processConversionJob(
        {
          attemptsMade: 2,
          data: {
            conversionId: "c1",
            normalizedOptions: { fileName: "x.pdf" },
            sourceReference: "https://public.example",
            sourceType: "URL"
          },
          opts: { attempts: 3 }
        } as never,
        {
          env,
          outputStorage: {
            delete: deleteOutput,
            putPdf: vi.fn().mockResolvedValue({
              checksumSha256: "abc",
              contentType: "application/pdf",
              expiresAt: new Date(Date.now() + 1000),
              key: "00000000-0000-4000-8000-000000000000.pdf",
              sizeBytes: 8
            })
          } as never,
          prismaClient: prismaClient as never,
          render: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.7\n"))
        }
      )
    ).rejects.toMatchObject({ code: "PDF_GENERATION_FAILED" });

    expect(deleteOutput).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000000.pdf");
  });
});
