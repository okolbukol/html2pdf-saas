import {
  ConversionDomainError,
  parsePdfOptions,
  parseConversionJobPayload,
  toConversionDomainError
} from "@html2pdf-pro/conversions";
import { getAppEnv, type AppEnv } from "@html2pdf-pro/config";
import { prisma } from "@html2pdf-pro/database";
import { renderPdf, type PdfEngineLimits } from "@html2pdf-pro/pdf-engine";
import { LocalOutputStorage, LocalSourceStorage } from "@html2pdf-pro/storage";
import type { Job } from "bullmq";

interface ConversionRecord {
  expiresAt: Date | null;
  id: string;
  options: unknown;
  status: string;
}

interface PrismaLike {
  $transaction(queries: unknown[]): Promise<unknown>;
  conversion: {
    findUnique(args: unknown): Promise<ConversionRecord | null>;
    update(args: unknown): Promise<unknown>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  conversionFile: {
    create(args: unknown): unknown;
    upsert?(args: unknown): unknown;
  };
}

export interface WorkerDependencies {
  env?: AppEnv;
  outputStorage?: LocalOutputStorage;
  prismaClient?: PrismaLike;
  render?: typeof renderPdf;
  sourceStorage?: LocalSourceStorage;
}

export async function processConversionJob(
  job: Job<unknown>,
  dependencies: WorkerDependencies = {}
): Promise<void> {
  const env = dependencies.env ?? getAppEnv();
  const prismaClient = (dependencies.prismaClient ?? prisma) as PrismaLike;
  const sourceStorage =
    dependencies.sourceStorage ?? new LocalSourceStorage(env.HTML_SOURCE_STORAGE_PATH);
  const outputStorage =
    dependencies.outputStorage ?? new LocalOutputStorage(env.PDF_OUTPUT_STORAGE_PATH);
  const render = dependencies.render ?? renderPdf;
  const payload = parseConversionJobPayload(job.data);
  const startedAt = new Date();
  let outputKey: string | undefined;

  const conversion = await prismaClient.conversion.findUnique({
    where: { id: payload.conversionId }
  });

  if (!conversion) {
    throw new Error(`Conversion not found: ${payload.conversionId}`);
  }

  if (
    conversion.status === "COMPLETED" ||
    conversion.status === "FAILED" ||
    conversion.status === "CANCELLED"
  ) {
    return;
  }

  if (conversion.status !== "QUEUED") {
    await markFailedTerminal(
      prismaClient,
      payload.conversionId,
      startedAt,
      new ConversionDomainError("CONVERSION_STATE_CONFLICT")
    );
    return;
  }

  const transitioned = await prismaClient.conversion.updateMany({
    data: {
      startedAt,
      status: "PROCESSING"
    },
    where: { id: payload.conversionId, status: "QUEUED" }
  });

  if (transitioned.count !== 1) {
    return;
  }

  try {
    const options = parsePdfOptions(conversion.options);
    const source =
      payload.sourceType === "HTML"
        ? {
            html: await sourceStorage.getHtml(payload.sourceReference),
            type: "HTML" as const
          }
        : {
            type: "URL" as const,
            url: payload.sourceReference
          };
    const pdf = await render({
      limits: getPdfEngineLimits(env),
      options,
      source
    });
    const stored = await outputStorage.putPdf(pdf, {
      expiresAt: conversion.expiresAt ?? new Date(Date.now() + env.OUTPUT_TTL_SECONDS * 1000),
      maxBytes: env.PDF_MAX_BYTES
    });
    outputKey = stored.key;
    const completedAt = new Date();

    await prismaClient.$transaction([
      prismaClient.conversion.update({
        data: {
          completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime(),
          errorCode: null,
          errorMessage: null,
          outputBytes: stored.sizeBytes,
          status: "COMPLETED"
        },
        where: { id: payload.conversionId }
      }),
      upsertConversionFile(prismaClient, {
        checksum: stored.checksumSha256,
        contentType: "application/pdf",
        conversionId: payload.conversionId,
        expiresAt: stored.expiresAt,
        sizeBytes: stored.sizeBytes,
        storageKey: stored.key
      })
    ]);

    if (payload.sourceType === "HTML") {
      await sourceStorage.delete(payload.sourceReference);
    }
  } catch (error) {
    if (outputKey) {
      await outputStorage.delete(outputKey);
    }

    const domainError = toConversionDomainError(error);
    const isFinalAttempt = isFinalJobAttempt(job);

    if (isFinalAttempt || !domainError.retryable) {
      await markFailedTerminal(prismaClient, payload.conversionId, startedAt, domainError);
      if (payload.sourceType === "HTML") {
        await sourceStorage.delete(payload.sourceReference);
      }
    } else {
      await prismaClient.conversion.update({
        data: {
          errorCode: domainError.code,
          errorMessage: domainError.safeMessage,
          status: "QUEUED"
        },
        where: { id: payload.conversionId }
      });
    }

    throw domainError;
  }
}

export function getPdfEngineLimits(env: AppEnv): PdfEngineLimits {
  return {
    javascriptEnabled: env.PLAYWRIGHT_JAVASCRIPT_ENABLED,
    maxDomContentBytes: env.MAX_DOM_CONTENT_BYTES,
    maxNetworkBytes: env.MAX_TOTAL_NETWORK_BYTES,
    maxNetworkRequests: env.MAX_NETWORK_REQUESTS,
    maxPdfBytes: env.PDF_MAX_BYTES,
    maxRedirects: env.MAX_REDIRECTS,
    maxResourceBytes: env.MAX_RESOURCE_BYTES,
    navigationTimeoutMs: env.NAVIGATION_TIMEOUT_MS,
    pdfGenerationTimeoutMs: env.PDF_GENERATION_TIMEOUT_MS
  };
}

function isFinalJobAttempt(job: Job<unknown>): boolean {
  return (job.attemptsMade ?? 0) + 1 >= (job.opts.attempts ?? 1);
}

async function markFailedTerminal(
  prismaClient: PrismaLike,
  conversionId: string,
  startedAt: Date,
  error: ConversionDomainError
): Promise<void> {
  const completedAt = new Date();
  await prismaClient.conversion.update({
    data: {
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      errorCode: error.code,
      errorMessage: error.safeMessage,
      status: "FAILED"
    },
    where: { id: conversionId }
  });
}

function upsertConversionFile(
  prismaClient: PrismaLike,
  data: {
    checksum: string;
    contentType: string;
    conversionId: string;
    expiresAt: Date;
    sizeBytes: number;
    storageKey: string;
  }
) {
  if (prismaClient.conversionFile.upsert) {
    return prismaClient.conversionFile.upsert({
      create: data,
      update: {
        checksum: data.checksum,
        contentType: data.contentType,
        deletedAt: null,
        expiresAt: data.expiresAt,
        sizeBytes: data.sizeBytes,
        storageKey: data.storageKey
      },
      where: {
        conversionId: data.conversionId
      }
    });
  }

  return prismaClient.conversionFile.create({ data });
}
