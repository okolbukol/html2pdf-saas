import { ConversionDomainError } from "@html2pdf-pro/conversions";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveStorageMetadataPath, resolveStoragePath, resolveStorageTempPath } from "./paths";
import type { SourceStorage, StoredHtmlSource } from "./types";

interface HtmlMetadata {
  byteLength: number;
  expiresAt: string;
  key: string;
}

export class LocalSourceStorage implements SourceStorage {
  constructor(private readonly root: string) {}

  async putHtml(
    html: string,
    options: { expiresAt: Date; maxBytes: number }
  ): Promise<StoredHtmlSource> {
    const byteLength = Buffer.byteLength(html, "utf8");
    if (byteLength > options.maxBytes) {
      throw new ConversionDomainError("HTML_SOURCE_TOO_LARGE");
    }

    await fs.mkdir(this.root, { recursive: true });
    const key = `${crypto.randomUUID()}.html`;
    const htmlPath = resolveStoragePath(this.root, key);
    const metadataPath = this.metadataPath(key);
    const htmlTempPath = resolveStorageTempPath(this.root, key);
    const metadataTempPath = `${metadataPath}.tmp`;
    const metadata: HtmlMetadata = {
      byteLength,
      expiresAt: options.expiresAt.toISOString(),
      key
    };

    await fs.writeFile(htmlTempPath, html, { encoding: "utf8", flag: "wx", mode: 0o600 });
    await fs.rename(htmlTempPath, htmlPath);
    await fs.writeFile(metadataTempPath, JSON.stringify(metadata), {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600
    });
    await fs.rename(metadataTempPath, metadataPath);

    return { byteLength, expiresAt: options.expiresAt, key };
  }

  async getHtml(key: string): Promise<string> {
    if (!(await this.exists(key))) {
      throw new ConversionDomainError("HTML_SOURCE_NOT_FOUND");
    }
    const htmlPath = resolveStoragePath(this.root, key);
    await assertNotSymlink(htmlPath);
    return fs.readFile(htmlPath, "utf8");
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

  async cleanupExpired(now = new Date()): Promise<number> {
    await fs.mkdir(this.root, { recursive: true });
    const entries = await fs.readdir(this.root);
    let deleted = 0;

    for (const entry of entries.filter((name) => name.endsWith(".html.meta.json"))) {
      const key = entry.replace(".meta.json", "");
      const metadata = JSON.parse(
        await fs.readFile(this.metadataPath(key), "utf8")
      ) as HtmlMetadata;
      if (new Date(metadata.expiresAt) <= now) {
        await this.delete(metadata.key);
        deleted += 1;
      }
    }

    return deleted;
  }

  async listHtmlSources(limit = 100): Promise<StoredHtmlSource[]> {
    await fs.mkdir(this.root, { recursive: true });
    const entries = await fs.readdir(this.root);
    const sources: StoredHtmlSource[] = [];

    for (const entry of entries
      .filter((name) => name.endsWith(".html.meta.json"))
      .slice(0, limit)) {
      const key = entry.replace(".meta.json", "");
      const metadata = JSON.parse(
        await fs.readFile(this.metadataPath(key), "utf8")
      ) as HtmlMetadata;
      sources.push({
        byteLength: metadata.byteLength,
        expiresAt: new Date(metadata.expiresAt),
        key: metadata.key
      });
    }

    return sources;
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

async function assertNotSymlink(filePath: string): Promise<void> {
  const stat = await fs.lstat(filePath);
  if (stat.isSymbolicLink()) {
    throw new Error("Storage symlinks are not allowed");
  }
}
