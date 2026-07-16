import { describe, expect, it } from "vitest";
import { assertConversionTransition, canTransitionConversion } from "./state-machine";

describe("conversion state machine", () => {
  it("allows valid lifecycle transitions", () => {
    expect(canTransitionConversion("PENDING", "QUEUED")).toBe(true);
    expect(canTransitionConversion("PENDING", "FAILED")).toBe(true);
    expect(canTransitionConversion("QUEUED", "PROCESSING")).toBe(true);
    expect(canTransitionConversion("PROCESSING", "COMPLETED")).toBe(true);
    expect(canTransitionConversion("PROCESSING", "FAILED")).toBe(true);
    expect(canTransitionConversion("PENDING", "CANCELLED")).toBe(true);
    expect(canTransitionConversion("QUEUED", "CANCELLED")).toBe(true);
    expect(canTransitionConversion("COMPLETED", "EXPIRED")).toBe(true);
  });

  it("rejects invalid lifecycle transitions", () => {
    expect(() => assertConversionTransition("PENDING", "COMPLETED")).toThrow(
      "Invalid conversion status transition"
    );
    expect(() => assertConversionTransition("FAILED", "PROCESSING")).toThrow(
      "Invalid conversion status transition"
    );
  });
});
