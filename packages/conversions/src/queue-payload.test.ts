import { describe, expect, it } from "vitest";
import { parseConversionJobPayload } from "./queue-payload";

describe("conversion queue payload", () => {
  it("accepts compact source references", () => {
    expect(() =>
      parseConversionJobPayload({
        conversionId: "conversion_1",
        normalizedOptions: { format: "A4" },
        sourceReference: "storage://temporary/conversion_1.html",
        sourceType: "HTML"
      })
    ).not.toThrow();
  });

  it("rejects raw HTML and secret-like fields", () => {
    expect(() =>
      parseConversionJobPayload({
        conversionId: "conversion_1",
        normalizedOptions: {},
        sourceReference: "<html>too large for a job payload</html>",
        sourceType: "HTML"
      })
    ).toThrow("raw HTML");

    expect(() =>
      parseConversionJobPayload({
        conversionId: "conversion_1",
        normalizedOptions: { authorization: "Bearer abc" },
        sourceReference: "https://example.com",
        sourceType: "URL"
      })
    ).toThrow("secrets");
  });
});
