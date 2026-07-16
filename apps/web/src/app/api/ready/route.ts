import { getAppEnv } from "@html2pdf-pro/config";
import { prisma } from "@html2pdf-pro/database";
import { createConversionQueue } from "@html2pdf-pro/queue";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, boolean> = {
    config: false,
    database: false,
    redis: false,
    storage: false
  };

  try {
    const env = getAppEnv();
    checks.config = true;
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;

    const queue = createConversionQueue();
    try {
      await queue.getJobCounts();
      checks.redis = true;
    } finally {
      await queue.close();
    }

    await assertStorageWritable(env.LOCAL_STORAGE_PATH);
    await assertStorageWritable(env.HTML_SOURCE_STORAGE_PATH);
    await assertStorageWritable(env.PDF_OUTPUT_STORAGE_PATH);
    checks.storage = true;
  } catch {
    return NextResponse.json(
      {
        data: {
          checks,
          status: "not_ready"
        },
        success: false
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    data: {
      checks,
      status: "ready"
    },
    success: true
  });
}

async function assertStorageWritable(root: string): Promise<void> {
  await fs.mkdir(root, { recursive: true });
  const probe = path.join(root, `.ready-${process.pid}-${Date.now()}`);
  await fs.writeFile(probe, "ok", { encoding: "utf8", flag: "wx", mode: 0o600 });
  await fs.readFile(probe, "utf8");
  await fs.rm(probe, { force: true });
}
