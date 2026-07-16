import { getAppEnv } from "@html2pdf-pro/config";
import { prisma } from "@html2pdf-pro/database";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const idSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const env = getAppEnv();
  const internalSecret = request.headers.get("x-internal-api-secret");

  if (!internalSecret || internalSecret !== env.INTERNAL_API_SECRET) {
    return errorResponse("UNAUTHORIZED", "Internal API secret is required.", 401);
  }

  const { id } = await context.params;
  const parsedId = idSchema.safeParse(id);

  if (!parsedId.success) {
    return errorResponse("INVALID_CONVERSION_ID", "Invalid conversion id.", 400);
  }

  const conversion = await prisma.conversion.findUnique({
    include: {
      files: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    where: { id: parsedId.data }
  });

  if (!conversion) {
    return errorResponse("CONVERSION_NOT_FOUND", "Conversion was not found.", 404);
  }

  const file = conversion.files[0];

  return NextResponse.json({
    data: {
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
    },
    success: true
  });
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
