import { describe, expect, it } from "vitest";
import { createConversionJobId } from "./conversion-queue";

describe("conversion job id", () => {
  const conversionId = "2d91ae60-3db5-49ef-b3bd-e3015659d283";

  it("creates a BullMQ-safe deterministic job id for a valid conversion UUID", () => {
    const jobId = createConversionJobId(conversionId);

    expect(jobId).toBe(`conversion-${conversionId}`);
    expect(jobId).not.toContain(":");
    expect(jobId).not.toMatch(/\s/);
    expect(createConversionJobId(conversionId)).toBe(jobId);
  });

  it("creates different job ids for different conversion UUIDs", () => {
    expect(createConversionJobId(conversionId)).not.toBe(
      createConversionJobId("b59c0d05-352b-4ad1-9281-b818e4694919")
    );
  });

  it("rejects invalid conversion ids", () => {
    expect(() => createConversionJobId("")).toThrow("valid conversion UUID");
    expect(() => createConversionJobId("conversion-2d91ae60-3db5-49ef-b3bd-e3015659d283")).toThrow(
      "valid conversion UUID"
    );
    expect(() => createConversionJobId("2d91ae60:3db5:49ef:b3bd:e3015659d283")).toThrow(
      "valid conversion UUID"
    );
  });
});
