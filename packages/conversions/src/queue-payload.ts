import { z } from "zod";

export const conversionSourceTypes = ["HTML", "URL", "TEMPLATE"] as const;

export const conversionJobPayloadSchema = z.object({
  conversionId: z.string().min(1),
  normalizedOptions: z.record(z.unknown()),
  sourceReference: z.string().min(1).max(512),
  sourceType: z.enum(conversionSourceTypes)
});

export type ConversionJobPayload = z.infer<typeof conversionJobPayloadSchema>;

const secretLikePattern = /(authorization|cookie|secret|token|api[-_]?key|password)/i;

export function assertSafeConversionJobPayload(payload: ConversionJobPayload): void {
  const serialized = JSON.stringify(payload);

  if (serialized.length > 8_192) {
    throw new Error("Conversion job payload is too large");
  }

  if (secretLikePattern.test(serialized)) {
    throw new Error("Conversion job payload must not contain secrets");
  }

  if (/<html[\s>]/i.test(serialized) || /<!doctype html/i.test(serialized)) {
    throw new Error("Conversion job payload must not contain raw HTML");
  }
}

export function parseConversionJobPayload(input: unknown): ConversionJobPayload {
  const payload = conversionJobPayloadSchema.parse(input);
  assertSafeConversionJobPayload(payload);
  return payload;
}
