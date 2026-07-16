import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@html2pdf-pro/config", () => ({
  getAppEnv: () => ({
    INTERNAL_API_SECRET: "b".repeat(32),
    PDF_OUTPUT_STORAGE_PATH: "./storage/outputs"
  })
}));

vi.mock("@html2pdf-pro/database", () => ({
  prisma: {
    conversion: {
      findUnique: vi.fn().mockResolvedValue({
        fileName: "report\r\nbad.pdf",
        files: [
          {
            contentType: "application/pdf",
            storageKey: "00000000-0000-4000-8000-000000000000.pdf"
          }
        ],
        status: "COMPLETED"
      })
    }
  }
}));

vi.mock("@html2pdf-pro/storage", () => ({
  LocalOutputStorage: class {
    async getBuffer() {
      return Buffer.from("%PDF-1.7\n");
    }
  }
}));

describe("internal conversion file endpoint", () => {
  it("rejects downloads without internal secret", async () => {
    const response = await GET(new Request("http://localhost/file") as never, {
      params: Promise.resolve({ id: "conversion-1" })
    });

    expect(response.status).toBe(401);
  });

  it("returns a sanitized PDF attachment", async () => {
    const response = await GET(
      new Request("http://localhost/file", {
        headers: { "x-internal-api-secret": "b".repeat(32) }
      }) as never,
      { params: Promise.resolve({ id: "conversion-1" }) }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition")).not.toContain("\r");
  });
});
