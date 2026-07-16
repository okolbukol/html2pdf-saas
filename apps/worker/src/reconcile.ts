import { getAppEnv, type AppEnv } from "@html2pdf-pro/config";
import { prisma, type PrismaClient } from "@html2pdf-pro/database";
import { createConversionJobId, createConversionQueue } from "@html2pdf-pro/queue";
import { LocalOutputStorage, LocalSourceStorage } from "@html2pdf-pro/storage";

export interface ReconciliationReport {
  completedWithoutFile: string[];
  dbFileMissingStorage: string[];
  dryRun: boolean;
  expiredOutputsStillPresent: string[];
  expiredSourcesStillPresent: string[];
  processingWithoutJob: string[];
  safeStorageOnlyOutputsDeleted: string[];
  storagePdfWithoutDb: string[];
}

export interface ReconciliationDependencies {
  env?: AppEnv;
  now?: Date;
  outputStorage?: LocalOutputStorage;
  prismaClient?: PrismaClient;
  sourceStorage?: LocalSourceStorage;
}

export async function runReconciliation(
  dependencies: ReconciliationDependencies = {}
): Promise<ReconciliationReport> {
  const env = dependencies.env ?? getAppEnv();
  const now = dependencies.now ?? new Date();
  const prismaClient = dependencies.prismaClient ?? prisma;
  const sourceStorage =
    dependencies.sourceStorage ?? new LocalSourceStorage(env.HTML_SOURCE_STORAGE_PATH);
  const outputStorage =
    dependencies.outputStorage ?? new LocalOutputStorage(env.PDF_OUTPUT_STORAGE_PATH);
  const dryRun = env.CLEANUP_DRY_RUN;

  const [dbFiles, storagePdfs, storageSources, completedWithoutFile, processing] =
    await Promise.all([
      prismaClient.conversionFile.findMany({
        select: { conversionId: true, storageKey: true },
        where: { deletedAt: null },
        take: env.CLEANUP_BATCH_SIZE
      }),
      outputStorage.listPdfs(env.CLEANUP_BATCH_SIZE),
      sourceStorage.listHtmlSources(env.CLEANUP_BATCH_SIZE),
      prismaClient.conversion.findMany({
        select: { id: true },
        where: {
          files: { none: {} },
          status: "COMPLETED"
        },
        take: env.CLEANUP_BATCH_SIZE
      }),
      prismaClient.conversion.findMany({
        select: { id: true },
        where: { status: "PROCESSING" },
        take: env.CLEANUP_BATCH_SIZE
      })
    ]);

  const dbStorageKeys = new Set(dbFiles.map((file) => file.storageKey));
  const storageKeys = new Set(storagePdfs.map((file) => file.key));
  const dbFileMissingStorage = dbFiles
    .filter((file) => !storageKeys.has(file.storageKey))
    .map((file) => file.conversionId);
  const storagePdfWithoutDb = storagePdfs
    .filter((file) => !dbStorageKeys.has(file.key))
    .map((file) => file.key);
  const expiredOutputsStillPresent = storagePdfs
    .filter((file) => file.expiresAt <= now)
    .map((file) => file.key);
  const expiredSourcesStillPresent = storageSources
    .filter((source) => source.expiresAt <= now)
    .map((source) => source.key);
  const processingWithoutJob = await findProcessingWithoutJobs(processing.map((item) => item.id));
  const safeStorageOnlyOutputsDeleted: string[] = [];

  if (!dryRun) {
    for (const key of storagePdfWithoutDb.filter((key) =>
      expiredOutputsStillPresent.includes(key)
    )) {
      await outputStorage.delete(key);
      safeStorageOnlyOutputsDeleted.push(key);
    }
  }

  return {
    completedWithoutFile: completedWithoutFile.map((conversion) => conversion.id),
    dbFileMissingStorage,
    dryRun,
    expiredOutputsStillPresent,
    expiredSourcesStillPresent,
    processingWithoutJob,
    safeStorageOnlyOutputsDeleted,
    storagePdfWithoutDb
  };
}

async function findProcessingWithoutJobs(conversionIds: string[]): Promise<string[]> {
  if (conversionIds.length === 0) {
    return [];
  }

  const queue = createConversionQueue();
  try {
    const missing: string[] = [];
    for (const id of conversionIds) {
      const job = await queue.getJob(createConversionJobId(id));
      if (!job) {
        missing.push(id);
      }
    }
    return missing;
  } finally {
    await queue.close();
  }
}
