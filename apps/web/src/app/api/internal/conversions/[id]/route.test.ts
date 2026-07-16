import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@html2pdf-pro/config", () => ({
  getAppEnv: () => ({
    APP_SECRET: "a".repeat(32),
    DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
    INTERNAL_API_SECRET: "b".repeat(32),
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NODE_ENV: "test",
    REDIS_URL: "redis://localhost:6379",
    STORAGE_DRIVER: "local"
  })
}));

vi.mock("@html2pdf-pro/database", () => ({
  prisma: {
    conversion: {
      findUnique: vi.fn().mockResolvedValue({
        completedAt: new Date("2026-07-14T10:00:00.000Z"),
        createdAt: new Date("2026-07-14T09:00:00.000Z"),
        errorCode: null,
        errorMessage: null,
        expiresAt: new Date("2026-07-15T09:00:00.000Z"),
        fileName: "invoice.pdf",
        files: [
          {
            checksum: "abc",
            contentType: "application/pdf",
            expiresAt: new Date("2026-07-15T09:00:00.000Z"),
            sizeBytes: 42,
            storageKey: "00000000-0000-4000-8000-000000000000.pdf"
          }
        ],
        id: "conversion-1",
        queuedAt: new Date("2026-07-14T09:01:00.000Z"),
        sourceHtmlStorageKey: "00000000-0000-4000-8000-000000000000.html",
        sourceType: "HTML",
        startedAt: new Date("2026-07-14T09:02:00.000Z"),
        status: "COMPLETED"
      })
    }
  }
}));

describe("internal conversion status endpoint", () => {
  it("returns safe conversion fields", async () => {
    const request = new Request("http://localhost/api/internal/conversions/conversion-1", {
      headers: { "x-internal-api-secret": "b".repeat(32) }
    });
    const response = await GET(request as Parameters<typeof GET>[0], {
      params: Promise.resolve({ id: "conversion-1" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.file).toMatchObject({
      checksum: "abc",
      mimeType: "application/pdf",
      sizeBytes: 42
    });
    expect(JSON.stringify(body)).not.toContain("storageKey");
    expect(JSON.stringify(body)).not.toContain("sourceHtmlStorageKey");
  });
});
