import { z } from "zod";

const pdfFormats = ["A4", "A3", "A5", "Letter", "Legal"] as const;
const mediaTypes = ["screen", "print"] as const;
const waitUntilValues = ["load", "domcontentloaded", "networkidle"] as const;
const cssLengthSchema = z.string().regex(/^\d{1,3}(\.\d{1,2})?(px|mm|cm|in)$/);

export const pdfOptionsSchema = z.object({
  fileName: z.string().min(1).max(128).transform(sanitizePdfFileName),
  format: z.enum(pdfFormats).default("A4"),
  landscape: z.boolean().default(false),
  margins: z
    .object({
      top: cssLengthSchema.default("20mm"),
      right: cssLengthSchema.default("15mm"),
      bottom: cssLengthSchema.default("20mm"),
      left: cssLengthSchema.default("15mm")
    })
    .default({}),
  mediaType: z.enum(mediaTypes).default("print"),
  printBackground: z.boolean().default(true),
  scale: z.number().min(0.1).max(2).default(1),
  timeoutMs: z.number().int().min(1_000).max(120_000).default(30_000),
  waitUntil: z.enum(waitUntilValues).default("networkidle")
});

export type PdfOptions = z.infer<typeof pdfOptionsSchema>;

export function sanitizePdfFileName(fileName: string): string {
  const sanitized = fileName
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "")
    .slice(0, 128);

  const fallback = sanitized.length > 0 ? sanitized : "document.pdf";
  return fallback.toLowerCase().endsWith(".pdf") ? fallback : `${fallback}.pdf`;
}

export function parsePdfOptions(input: unknown): PdfOptions {
  return pdfOptionsSchema.parse(input);
}
