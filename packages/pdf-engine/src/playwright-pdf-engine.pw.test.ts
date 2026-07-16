import { describe, expect, it } from "vitest";
import { renderPdf, type PdfEngineLimits } from "./playwright-pdf-engine";

const limits: PdfEngineLimits = {
  javascriptEnabled: true,
  maxDomContentBytes: 1_000_000,
  maxNetworkBytes: 1_000_000,
  maxNetworkRequests: 20,
  maxPdfBytes: 5_000_000,
  maxRedirects: 3,
  maxResourceBytes: 1_000_000,
  navigationTimeoutMs: 10_000,
  pdfGenerationTimeoutMs: 10_000
};

describe("Playwright PDF engine", () => {
  it("renders HTML to a real PDF", async () => {
    const pdf = await renderPdf({
      limits,
      options: {
        fileName: "test.pdf",
        format: "A4",
        landscape: false,
        margins: { bottom: "10mm", left: "10mm", right: "10mm", top: "10mm" },
        mediaType: "print",
        printBackground: true,
        scale: 1,
        timeoutMs: 10_000,
        waitUntil: "load"
      },
      source: { html: "<html><body><h1>Hello PDF</h1></body></html>", type: "HTML" }
    });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  }, 20_000);
});
