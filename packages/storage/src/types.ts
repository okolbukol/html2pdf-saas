export interface StoredHtmlSource {
  byteLength: number;
  expiresAt: Date;
  key: string;
}

export interface SourceStorage {
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getHtml(key: string): Promise<string>;
  putHtml(html: string, options: { expiresAt: Date; maxBytes: number }): Promise<StoredHtmlSource>;
  cleanupExpired(now?: Date): Promise<number>;
}

export interface StoredPdf {
  checksumSha256: string;
  contentType: "application/pdf";
  expiresAt: Date;
  key: string;
  sizeBytes: number;
}

export interface OutputStorage {
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getBuffer(key: string): Promise<Buffer>;
  getMetadata(key: string): Promise<StoredPdf>;
  putPdf(pdf: Buffer, options: { expiresAt: Date; maxBytes: number }): Promise<StoredPdf>;
}
