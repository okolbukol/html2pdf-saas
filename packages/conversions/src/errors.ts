export const conversionErrorDefinitions = {
  BROWSER_CRASHED: { retryable: true, safeMessage: "Browser process failed." },
  BROWSER_LAUNCH_FAILED: { retryable: true, safeMessage: "Browser could not be started." },
  CONVERSION_STATE_CONFLICT: { retryable: false, safeMessage: "Conversion state conflict." },
  HTML_SOURCE_NOT_FOUND: { retryable: false, safeMessage: "HTML source was not found." },
  HTML_SOURCE_TOO_LARGE: { retryable: false, safeMessage: "HTML source is too large." },
  INVALID_PDF_OUTPUT: { retryable: false, safeMessage: "Generated PDF output is invalid." },
  NETWORK_TRANSFER_LIMIT_EXCEEDED: {
    retryable: false,
    safeMessage: "Network transfer limit exceeded."
  },
  OUTPUT_STORAGE_ERROR: { retryable: true, safeMessage: "PDF output storage failed." },
  OUTPUT_TOO_LARGE: { retryable: false, safeMessage: "Generated PDF is too large." },
  PAGE_LOAD_TIMEOUT: { retryable: true, safeMessage: "Page load timed out." },
  PDF_GENERATION_FAILED: { retryable: true, safeMessage: "PDF generation failed." },
  PDF_GENERATION_TIMEOUT: { retryable: true, safeMessage: "PDF generation timed out." },
  QUEUE_ENQUEUE_FAILED: { retryable: true, safeMessage: "Conversion could not be queued." },
  SOURCE_STORAGE_ERROR: { retryable: true, safeMessage: "HTML source storage failed." },
  TOO_MANY_NETWORK_REQUESTS: { retryable: false, safeMessage: "Network request limit exceeded." },
  UNSAFE_NETWORK_REQUEST: { retryable: false, safeMessage: "Unsafe network request blocked." }
} as const;

export type ConversionErrorCode = keyof typeof conversionErrorDefinitions;

export class ConversionDomainError extends Error {
  readonly retryable: boolean;
  readonly safeMessage: string;

  constructor(
    readonly code: ConversionErrorCode,
    message?: string
  ) {
    const definition = conversionErrorDefinitions[code];
    super(message ?? definition.safeMessage);
    this.name = "ConversionDomainError";
    this.retryable = definition.retryable;
    this.safeMessage = definition.safeMessage;
  }
}

export function toConversionDomainError(error: unknown): ConversionDomainError {
  if (error instanceof ConversionDomainError) {
    return error;
  }

  if (error instanceof Error && error.name === "TimeoutError") {
    return new ConversionDomainError("PAGE_LOAD_TIMEOUT");
  }

  return new ConversionDomainError("PDF_GENERATION_FAILED");
}
