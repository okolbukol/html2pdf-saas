export const conversionStatuses = [
  "PENDING",
  "QUEUED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "EXPIRED",
  "CANCELLED"
] as const;

export type ConversionStatus = (typeof conversionStatuses)[number];

const allowedTransitions = {
  PENDING: ["QUEUED", "FAILED", "CANCELLED"],
  QUEUED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["COMPLETED", "FAILED"],
  COMPLETED: ["EXPIRED"],
  FAILED: [],
  EXPIRED: [],
  CANCELLED: []
} satisfies Record<ConversionStatus, ConversionStatus[]>;

export class InvalidConversionTransitionError extends Error {
  constructor(from: ConversionStatus, to: ConversionStatus) {
    super(`Invalid conversion status transition: ${from} -> ${to}`);
    this.name = "InvalidConversionTransitionError";
  }
}

export function canTransitionConversion(from: ConversionStatus, to: ConversionStatus): boolean {
  return (allowedTransitions[from] as readonly ConversionStatus[]).includes(to);
}

export function assertConversionTransition(from: ConversionStatus, to: ConversionStatus): void {
  if (!canTransitionConversion(from, to)) {
    throw new InvalidConversionTransitionError(from, to);
  }
}
