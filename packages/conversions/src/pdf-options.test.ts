import { describe, expect, it } from "vitest";
import { parsePdfOptions } from "./pdf-options";

describe("PDF options validation", () => {
  it("normalizes and sanitizes valid options", () => {
    const options = parsePdfOptions({
      fileName: "../invoice:Q1",
      format: "A4",
      scale: 1,
      timeoutMs: 10_000
    });

    expect(options.fileName).toBe("-invoice-Q1.pdf");
  });

  it("rejects out-of-range values", () => {
    expect(() =>
      parsePdfOptions({
        fileName: "x.pdf",
        scale: 3,
        timeoutMs: 999
      })
    ).toThrow();
  });
});
