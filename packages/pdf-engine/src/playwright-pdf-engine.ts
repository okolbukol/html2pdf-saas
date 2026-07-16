import {
  ConversionDomainError,
  validateSafePublicUrl,
  type DnsResolver,
  type PdfOptions
} from "@html2pdf-pro/conversions";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export interface PdfEngineLimits {
  javascriptEnabled: boolean;
  maxDomContentBytes: number;
  maxNetworkBytes: number;
  maxNetworkRequests: number;
  maxPdfBytes: number;
  maxRedirects: number;
  maxResourceBytes: number;
  navigationTimeoutMs: number;
  pdfGenerationTimeoutMs: number;
  resolver?: DnsResolver;
}

export type PdfSource = { html: string; type: "HTML" } | { type: "URL"; url: string };

export interface RenderPdfInput {
  limits: PdfEngineLimits;
  options: PdfOptions;
  source: PdfSource;
}

const blockedProtocols = new Set(["file:", "data:", "ftp:", "javascript:", "gopher:", "chrome:"]);

export async function renderPdf(input: RenderPdfInput): Promise<Buffer> {
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;

  try {
    browser = await chromium.launch({
      args: ["--disable-dev-shm-usage"],
      headless: true
    });
    context = await browser.newContext({
      acceptDownloads: false,
      bypassCSP: false,
      javaScriptEnabled: input.limits.javascriptEnabled,
      serviceWorkers: "block"
    });
    page = await context.newPage();

    const assertNetworkPolicy = await installNetworkPolicy(page, input.limits);
    page.on("dialog", async (dialog) => dialog.dismiss());
    page.on("popup", async (popup) => popup.close());
    page.setDefaultNavigationTimeout(input.limits.navigationTimeoutMs);
    page.setDefaultTimeout(input.limits.pdfGenerationTimeoutMs);

    if (input.source.type === "HTML") {
      assertHtmlWithinLimit(input.source.html, input.limits.maxDomContentBytes);
      await page.setContent(input.source.html, {
        timeout: input.limits.navigationTimeoutMs,
        waitUntil: input.options.waitUntil
      });
    } else {
      await validateSafePublicUrl(input.source.url, {
        maxRedirects: input.limits.maxRedirects,
        resolver: input.limits.resolver
      });
      await page.goto(input.source.url, {
        timeout: input.limits.navigationTimeoutMs,
        waitUntil: input.options.waitUntil
      });
    }

    assertNetworkPolicy();
    await page.emulateMedia({ media: input.options.mediaType });
    const pdf = await withTimeout(
      page.pdf({
        format: input.options.format,
        landscape: input.options.landscape,
        margin: input.options.margins,
        printBackground: input.options.printBackground,
        scale: input.options.scale
      }),
      input.limits.pdfGenerationTimeoutMs
    );

    if (pdf.byteLength > input.limits.maxPdfBytes) {
      throw new ConversionDomainError("OUTPUT_TOO_LARGE");
    }

    return pdf;
  } catch (error) {
    if (error instanceof ConversionDomainError) {
      throw error;
    }

    if (error instanceof Error && /browser.*closed|target.*closed|crash/i.test(error.message)) {
      throw new ConversionDomainError("BROWSER_CRASHED");
    }

    if (error instanceof Error && /timeout/i.test(error.message)) {
      throw new ConversionDomainError("PAGE_LOAD_TIMEOUT");
    }

    throw new ConversionDomainError("PDF_GENERATION_FAILED");
  } finally {
    await Promise.allSettled([page?.close(), context?.close(), browser?.close()]);
  }
}

async function installNetworkPolicy(page: Page, limits: PdfEngineLimits): Promise<() => void> {
  let requestCount = 0;
  let transferredBytes = 0;
  let policyError: ConversionDomainError | undefined;
  const seenDocumentUrls: string[] = [];

  page.on("response", async (response) => {
    const lengthHeader = response.headers()["content-length"];
    const length = lengthHeader ? Number(lengthHeader) : 0;

    if (Number.isFinite(length)) {
      if (length > limits.maxResourceBytes) {
        policyError = new ConversionDomainError("NETWORK_TRANSFER_LIMIT_EXCEEDED");
        return;
      }
      transferredBytes += length;
    }

    if (transferredBytes > limits.maxNetworkBytes) {
      policyError = new ConversionDomainError("NETWORK_TRANSFER_LIMIT_EXCEEDED");
    }
  });

  await page.route("**/*", async (route) => {
    requestCount += 1;
    if (requestCount > limits.maxNetworkRequests) {
      policyError = new ConversionDomainError("TOO_MANY_NETWORK_REQUESTS");
      await route.abort("blockedbyclient");
      return;
    }

    const request = route.request();
    const url = request.url();

    if (isBlockedProtocol(url) || request.resourceType() === "websocket") {
      policyError = new ConversionDomainError("UNSAFE_NETWORK_REQUEST");
      await route.abort("blockedbyclient");
      return;
    }

    try {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        seenDocumentUrls.push(url);
        if (seenDocumentUrls.length > limits.maxRedirects + 1) {
          throw new ConversionDomainError("PAGE_LOAD_TIMEOUT", "Too many redirects.");
        }
      }

      await validateSafePublicUrl(url, {
        maxRedirects: limits.maxRedirects,
        redirectCount: Math.max(0, seenDocumentUrls.length - 1),
        resolver: limits.resolver
      });
      await route.continue();
    } catch (error) {
      policyError =
        error instanceof ConversionDomainError
          ? error
          : new ConversionDomainError("UNSAFE_NETWORK_REQUEST");
      await route.abort("blockedbyclient");
    }
  });

  return () => {
    if (policyError) {
      throw policyError;
    }
  };
}

function isBlockedProtocol(rawUrl: string): boolean {
  try {
    return blockedProtocols.has(new URL(rawUrl).protocol);
  } catch {
    return true;
  }
}

function assertHtmlWithinLimit(html: string, maxBytes: number): void {
  if (Buffer.byteLength(html, "utf8") > maxBytes) {
    throw new ConversionDomainError("HTML_SOURCE_TOO_LARGE");
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new ConversionDomainError("PDF_GENERATION_TIMEOUT")),
      timeoutMs
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
