import { sanitizePdfFileName } from "@html2pdf-pro/conversions";
import { getAppEnv } from "@html2pdf-pro/config";
import { prisma } from "@html2pdf-pro/database";
import { LocalOutputStorage } from "@html2pdf-pro/storage";
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

  if (!conversion || conversion.status !== "COMPLETED") {
    return errorResponse("CONVERSION_NOT_READY", "Conversion is not completed.", 409);
  }

  const file = conversion.files[0];
  if (!file || file.contentType !== "application/pdf") {
    return errorResponse("PDF_NOT_FOUND", "PDF file was not found.", 404);
  }

  const storage = new LocalOutputStorage(env.PDF_OUTPUT_STORAGE_PATH);
  let pdf: Buffer;
  try {
    pdf = await storage.getBuffer(file.storageKey);
  } catch {
    return errorResponse("PDF_NOT_FOUND", "PDF file was not found.", 404);
  }
  const fileName = sanitizePdfFileName(conversion.fileName);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, "")}"`,
      "Content-Type": "application/pdf"
    }
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
