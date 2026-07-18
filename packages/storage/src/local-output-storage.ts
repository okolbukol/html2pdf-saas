import { ConversionDomainError } from "@html2pdf-pro/conversions";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveStorageMetadataPath, resolveStoragePath, resolveStorageTempPath } from "./paths";
import type { OutputStorage, StoredPdf } from "./types";

export class LocalOutputStorage implements OutputStorage {
  constructor(private readonly root: string) {}

  async putPdf(pdf: Buffer, options: { expiresAt: Date; maxBytes: number }): Promise<StoredPdf> {
    validatePdfBuffer(pdf, options.maxBytes);
    await fs.mkdir(this.root, { recursive: true });

    const key = `${crypto.randomUUID()}.pdf`;
    const outputPath = resolveStoragePath(this.root, key);
    const outputTempPath = resolveStorageTempPath(this.root, key);
    const metadataPath = this.metadataPath(key);
    const metadataTempPath = `${metadataPath}.tmp`;
    const checksumSha256 = crypto.createHash("sha256").update(pdf).digest("hex");
    const metadata: StoredPdf = {
      checksumSha256,
      contentType: "application/pdf",
      expiresAt: options.expiresAt,
      key,
      sizeBytes: pdf.byteLength
    };

    await fs.writeFile(outputTempPath, pdf, { flag: "wx", mode: 0o600 });
    await fs.rename(outputTempPath, outputPath);
    await fs.writeFile(metadataTempPath, JSON.stringify(metadata), {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600
    });
    await fs.rename(metadataTempPath, metadataPath);

    return metadata;
  }

  async getBuffer(key: string): Promise<Buffer> {
    const filePath = resolveStoragePath(this.root, key);
    await assertNotSymlink(filePath);
    return fs.readFile(filePath);
  }

  async getMetadata(key: string): Promise<StoredPdf> {
    const metadataPath = this.metadataPath(key);
    await assertNotSymlink(metadataPath);
    return JSON.parse(await fs.readFile(metadataPath, "utf8")) as StoredPdf;
  }

  async delete(key: string): Promise<void> {
    await Promise.allSettled([
      fs.rm(resolveStoragePath(this.root, key), { force: true }),
      fs.rm(this.metadataPath(key), { force: true })
    ]);
  }

  async exists(key: string): Promise<boolean> {
    try {
      const filePath = resolveStoragePath(this.root, key);
      await assertNotSymlink(filePath);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async listPdfs(limit = 100): Promise<StoredPdf[]> {
    await fs.mkdir(this.root, { recursive: true });
    const entries = await fs.readdir(this.root);
    const files: StoredPdf[] = [];

    for (const entry of entries.filter((name) => name.endsWith(".pdf.meta.json")).slice(0, limit)) {
      const key = entry.replace(".meta.json", "");
      files.push(await this.getMetadata(key));
    }

    return files;
  }

  async cleanupPartials(): Promise<number> {
    await fs.mkdir(this.root, { recursive: true });
    const entries = await fs.readdir(this.root);
    let deleted = 0;

    for (const entry of entries.filter((name) => name.endsWith(".tmp"))) {
      await fs.rm(path.join(this.root, entry), { force: true }).catch(() => undefined);
      deleted += 1;
    }

    return deleted;
  }

  private metadataPath(key: string): string {
    return resolveStorageMetadataPath(this.root, key);
  }
}

export function validatePdfBuffer(pdf: Buffer, maxBytes: number): void {
  if (pdf.byteLength > maxBytes) {
    throw new ConversionDomainError("OUTPUT_TOO_LARGE");
  }

  if (!pdf.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new ConversionDomainError("INVALID_PDF_OUTPUT");
  }
}

async function assertNotSymlink(filePath: string): Promise<void> {
  const stat = await fs.lstat(filePath);
  if (stat.isSymbolicLink()) {
    throw new Error("Storage symlinks are not allowed");
  }
}
