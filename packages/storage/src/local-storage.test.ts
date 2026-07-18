import { describe, expect, it } from "vitest";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validatePdfBuffer } from "./local-output-storage";
import { LocalOutputStorage } from "./local-output-storage";
import { LocalSourceStorage } from "./local-source-storage";
import { resolveStoragePath } from "./paths";

describe("local storage", () => {
  it("rejects path traversal keys", () => {
    expect(() => resolveStoragePath("storage", "../secret.html")).toThrow("Invalid storage key");
  });

  it("enforces HTML byte limits", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "html2pdf-source-"));
    try {
      const storage = new LocalSourceStorage(root);
      await expect(
        storage.putHtml("<h1>too big</h1>", { expiresAt: new Date(Date.now() + 1000), maxBytes: 4 })
      ).rejects.toMatchObject({ code: "HTML_SOURCE_TOO_LARGE" });
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("validates PDF magic bytes and output size", () => {
    expect(() => validatePdfBuffer(Buffer.from("not a pdf"), 100)).toThrow();
    expect(() => validatePdfBuffer(Buffer.from("%PDF-1.7\n"), 4)).toThrow();
    expect(() => validatePdfBuffer(Buffer.from("%PDF-1.7\n"), 100)).not.toThrow();
  });

  it("uses generated keys and removes temporary partial files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "html2pdf-output-"));
    try {
      const storage = new LocalOutputStorage(root);
      const stored = await storage.putPdf(Buffer.from("%PDF-1.7\n"), {
        expiresAt: new Date(Date.now() + 1000),
        maxBytes: 100
      });

      await writeFile(path.join(root, `${stored.key}.tmp`), "partial");
      await expect(storage.exists(stored.key)).resolves.toBe(true);
      await expect(storage.cleanupPartials()).resolves.toBe(1);
      await expect(storage.exists(stored.key)).resolves.toBe(true);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("rejects symlinked storage keys on read", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "html2pdf-symlink-"));
    const outside = await mkdtemp(path.join(os.tmpdir(), "html2pdf-outside-"));
    try {
      const key = "00000000-0000-4000-8000-000000000000.pdf";
      await symlink(path.join(outside, "escape.pdf"), path.join(root, key)).catch(() => undefined);
      const storage = new LocalOutputStorage(root);
      await expect(storage.getBuffer(key)).rejects.toThrow();
    } finally {
      await rm(root, { force: true, recursive: true });
      await rm(outside, { force: true, recursive: true });
    }
  });
});
