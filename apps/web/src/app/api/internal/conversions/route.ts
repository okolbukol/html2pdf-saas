import {
  ConversionDomainError,
  assertConversionTransition,
  parsePdfOptions,
  validateSafePublicUrl,
  type ConversionJobPayload
} from "@html2pdf-pro/conversions";
import { getAppEnv } from "@html2pdf-pro/config";
import { prisma } from "@html2pdf-pro/database";
import { enqueueConversionJob } from "@html2pdf-pro/queue";
import { LocalSourceStorage } from "@html2pdf-pro/storage";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z
  .object({
    html: z.string().min(1).max(2_000_000).optional(),
    options: z.unknown(),
    sourceType: z.enum(["HTML", "URL"]),
    url: z.string().min(1).max(2_048).optional()
  })
  .superRefine((value, ctx) => {
    if (value.sourceType === "HTML" && !value.html) {
      ctx.addIssue({ code: "custom", message: "html is required for HTML conversions" });
    }

    if (value.sourceType === "URL" && !value.url) {
      ctx.addIssue({ code: "custom", message: "url is required for URL conversions" });
    }
  });

const listQuerySchema = z.object({
  cursor: z.string().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sourceType: z.enum(["HTML", "URL", "TEMPLATE"]).optional(),
  status: z
    .enum(["PENDING", "QUEUED", "PROCESSING", "COMPLETED", "FAILED", "EXPIRED", "CANCELLED"])
    .optional()
});

export async function GET(request: NextRequest) {
  const authError = authorizeInternalRequest(request);
  if (authError) {
    return authError;
  }

  try {
    const parsedQuery = listQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    const conversions = await prisma.conversion.findMany({
      cursor: parsedQuery.cursor ? { id: parsedQuery.cursor } : undefined,
      include: {
        files: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: parsedQuery.cursor ? 1 : 0,
      take: parsedQuery.limit + 1,
      where: {
        sourceType: parsedQuery.sourceType,
        status: parsedQuery.status
      }
    });
    const page = conversions.slice(0, parsedQuery.limit);
    const next = conversions.length > parsedQuery.limit ? page.at(-1)?.id : null;

    return NextResponse.json({
      data: {
        items: page.map(serializeConversion),
        nextCursor: next
      },
      success: true
    });
  } catch (error) {
    return mapError(error);
  }
}

export async function POST(request: NextRequest) {
  const env = getAppEnv();
  const sourceStorage = new LocalSourceStorage(env.HTML_SOURCE_STORAGE_PATH);
  const authError = authorizeInternalRequest(request, env.INTERNAL_API_SECRET);

  if (authError) {
    return authError;
  }

  try {
    const body = requestSchema.parse(await request.json());
    const normalizedOptions = parsePdfOptions(body.options);
    const conversionId = randomUUID();
    const expiresAt = new Date(Date.now() + env.CONVERSION_RETENTION_HOURS * 60 * 60 * 1000);
    let sourceReference: string | undefined;

    const source =
      body.sourceType === "URL"
        ? await validateSafePublicUrl(body.url ?? "")
        : {
            normalizedUrl: null,
            resolvedAddresses: []
          };

    if (body.sourceType === "HTML") {
      const stored = await sourceStorage.putHtml(body.html ?? "", {
        expiresAt: new Date(Date.now() + env.HTML_SOURCE_TTL_SECONDS * 1000),
        maxBytes: env.HTML_MAX_BYTES
      });
      sourceReference = stored.key;
    } else {
      sourceReference = source.normalizedUrl ?? "";
    }

    const conversion = await prisma.conversion.create({
      data: {
        id: conversionId,
        expiresAt,
        fileName: normalizedOptions.fileName,
        options: normalizedOptions,
        sourceHtmlStorageKey: body.sourceType === "HTML" ? sourceReference : null,
        sourceType: body.sourceType,
        sourceUrl: body.sourceType === "URL" ? source.normalizedUrl : null,
        status: "PENDING"
      }
    });

    const payload: ConversionJobPayload = {
      conversionId: conversion.id,
      normalizedOptions,
      sourceReference,
      sourceType: body.sourceType
    };

    let queued;
    try {
      await enqueueConversionJob(payload);
      assertConversionTransition(conversion.status, "QUEUED");
      const queuedUpdate = await prisma.conversion.updateMany({
        data: {
          queuedAt: new Date(),
          status: "QUEUED"
        },
        where: { id: conversion.id, status: "PENDING" }
      });
      if (queuedUpdate.count !== 1) {
        throw new ConversionDomainError("CONVERSION_STATE_CONFLICT");
      }
      queued = await prisma.conversion.findUniqueOrThrow({ where: { id: conversion.id } });
    } catch (error) {
      if (body.sourceType === "HTML" && sourceReference) {
        await sourceStorage.delete(sourceReference);
      }
      assertConversionTransition("PENDING", "FAILED");
      await prisma.conversion.update({
        data: {
          completedAt: new Date(),
          errorCode: "QUEUE_ENQUEUE_FAILED",
          errorMessage: "Conversion could not be queued.",
          status: "FAILED"
        },
        where: { id: conversion.id }
      });
      throw new ConversionDomainError(
        "QUEUE_ENQUEUE_FAILED",
        error instanceof Error ? error.message : undefined
      );
    }

    return NextResponse.json({
      data: {
        id: queued.id,
        status: queued.status
      },
      success: true
    });
  } catch (error) {
    return mapError(error);
  }
}

function mapError(error: unknown) {
  if (error instanceof ConversionDomainError) {
    return errorResponse(error.code, error.safeMessage, error.retryable ? 503 : 400);
  }

  if (error instanceof z.ZodError) {
    return errorResponse("VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid request.", 400);
  }

  if (error instanceof Error && "code" in error) {
    const code = String((error as { code: string }).code);
    return errorResponse(code, "Request rejected by conversion safety policy.", 400);
  }

  return errorResponse("INTERNAL_CONVERSION_ERROR", "Unexpected internal error.", 500);
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      error: {
        code,
        message
      },
      success: false
    },
    { status }
  );
}

function authorizeInternalRequest(request: NextRequest, secret = getAppEnv().INTERNAL_API_SECRET) {
  const internalSecret = request.headers.get("x-internal-api-secret");

  if (!internalSecret || internalSecret !== secret) {
    return errorResponse("UNAUTHORIZED", "Internal API secret is required.", 401);
  }

  return null;
}

function serializeConversion(conversion: {
  completedAt: Date | null;
  createdAt: Date;
  errorCode: string | null;
  errorMessage: string | null;
  expiresAt: Date | null;
  fileName: string;
  files: {
    checksum: string | null;
    contentType: string;
    expiresAt: Date | null;
    sizeBytes: number;
  }[];
  id: string;
  queuedAt: Date | null;
  sourceType: string;
  startedAt: Date | null;
  status: string;
}) {
  const file = conversion.files[0];

  return {
    completedAt: conversion.completedAt,
    createdAt: conversion.createdAt,
    errorCode: conversion.errorCode,
    errorMessage: conversion.errorMessage,
    expiresAt: conversion.expiresAt,
    file: file
      ? {
          checksum: file.checksum,
          expiresAt: file.expiresAt,
          mimeType: file.contentType,
          sizeBytes: file.sizeBytes
        }
      : null,
    fileName: conversion.fileName,
    id: conversion.id,
    queuedAt: conversion.queuedAt,
    sourceType: conversion.sourceType,
    startedAt: conversion.startedAt,
    status: conversion.status
  };
}
