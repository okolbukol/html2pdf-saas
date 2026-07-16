import { describe, expect, it, vi } from "vitest";
import { createConversionJobId, enqueueConversionJob } from "./conversion-queue";

describe("conversion queue", () => {
  it("enqueues conversion jobs with a BullMQ-safe deterministic job id", async () => {
    const conversionId = "2d91ae60-3db5-49ef-b3bd-e3015659d283";
    const add = vi.fn().mockResolvedValue({ id: createConversionJobId(conversionId) });

    await enqueueConversionJob(
      {
        conversionId,
        normalizedOptions: { format: "A4" },
        sourceReference: "00000000-0000-4000-8000-000000000000.html",
        sourceType: "HTML"
      },
      { add } as never,
      {
        attempts: 3,
        concurrency: 1,
        jobTimeoutMs: 60_000,
        queueName: "pdf-conversions",
        redisUrl: "redis://localhost:6379"
      }
    );

    expect(add).toHaveBeenCalledWith(
      "render-pdf",
      expect.objectContaining({ conversionId }),
      expect.objectContaining({ jobId: createConversionJobId(conversionId) })
    );
  });
});
