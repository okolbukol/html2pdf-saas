import { getAppEnv } from "@html2pdf-pro/config";
import { prisma } from "@html2pdf-pro/database";
import { createConversionQueue } from "@html2pdf-pro/queue";
import fs from "node:fs/promises";
import path from "node:path";

async function main() {
  const env = getAppEnv();
  await prisma.$queryRaw`SELECT 1`;

  const queue = createConversionQueue();
  try {
    await queue.getJobCounts();
  } finally {
    await queue.close();
  }

  await assertStorageWritable(env.HTML_SOURCE_STORAGE_PATH);
  await assertStorageWritable(env.PDF_OUTPUT_STORAGE_PATH);
  await prisma.$disconnect();
}

async function assertStorageWritable(root: string): Promise<void> {
  await fs.mkdir(root, { recursive: true });
  const probe = path.join(root, `.worker-ready-${process.pid}-${Date.now()}`);
  await fs.writeFile(probe, "ok", { encoding: "utf8", flag: "wx", mode: 0o600 });
  await fs.readFile(probe, "utf8");
  await fs.rm(probe, { force: true });
}

await main();
