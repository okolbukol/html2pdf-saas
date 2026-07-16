import { getAppEnv, type AppEnv } from "@html2pdf-pro/config";
import { prisma, type PrismaClient } from "@html2pdf-pro/database";
import { LocalOutputStorage, LocalSourceStorage } from "@html2pdf-pro/storage";

export interface CleanupReport {
  completedConversionsExpired: number;
  dryRun: boolean;
  expiredOutputFilesDeleted: number;
  expiredOutputFilesFound: number;
  expiredSourceFilesDeleted: number;
  expiredSourceFilesFound: number;
  outputPartialsDeleted: number;
  sourcePartialsDeleted: number;
}

export interface CleanupDependencies {
  env?: AppEnv;
  now?: Date;
  outputStorage?: LocalOutputStorage;
  prismaClient?: PrismaClient;
  sourceStorage?: LocalSourceStorage;
}

export async function runCleanup(dependencies: CleanupDependencies = {}): Promise<CleanupReport> {
  const env = dependencies.env ?? getAppEnv();
  const now = dependencies.now ?? new Date();
  const prismaClient = dependencies.prismaClient ?? prisma;
  const sourceStorage =
    dependencies.sourceStorage ?? new LocalSourceStorage(env.HTML_SOURCE_STORAGE_PATH);
  const outputStorage =
    dependencies.outputStorage ?? new LocalOutputStorage(env.PDF_OUTPUT_STORAGE_PATH);
  const dryRun = env.CLEANUP_DRY_RUN;
  const batchSize = env.CLEANUP_BATCH_SIZE;
  const lockAcquired = await tryAcquireCleanupLock(prismaClient);

  if (!lockAcquired) {
    return emptyCleanupReport(dryRun);
  }

  try {
    return await runCleanupLocked({
      batchSize,
      dryRun,
      now,
      outputStorage,
      prismaClient,
      sourceStorage
    });
  } finally {
    await releaseCleanupLock(prismaClient);
  }
}

async function runCleanupLocked(input: {
  batchSize: number;
  dryRun: boolean;
  now: Date;
  outputStorage: LocalOutputStorage;
  prismaClient: PrismaClient;
  sourceStorage: LocalSourceStorage;
}): Promise<CleanupReport> {
  const { batchSize, dryRun, now, outputStorage, prismaClient, sourceStorage } = input;
  const expiredSources = (await sourceStorage.listHtmlSources(batchSize)).filter(
    (source) => source.expiresAt <= now
  );
  const activeSourceKeys = expiredSources.length
    ? await prismaClient.conversion.findMany({
        select: { sourceHtmlStorageKey: true },
        where: {
          sourceHtmlStorageKey: { in: expiredSources.map((source) => source.key) },
          status: { in: ["QUEUED", "PROCESSING"] }
        }
      })
    : [];
  const activeSourceKeySet = new Set(
    activeSourceKeys.flatMap((conversion) =>
      conversion.sourceHtmlStorageKey ? [conversion.sourceHtmlStorageKey] : []
    )
  );
  const deletableSources = expiredSources.filter((source) => !activeSourceKeySet.has(source.key));

  const expiredOutputs = (await outputStorage.listPdfs(batchSize)).filter(
    (file) => file.expiresAt <= now
  );
  const deletableOutputs = expiredOutputs;

  let expiredSourceFilesDeleted = 0;
  let expiredOutputFilesDeleted = 0;
  let sourcePartialsDeleted = 0;
  let outputPartialsDeleted = 0;
  let completedConversionsExpired = 0;

  if (!dryRun) {
    for (const source of deletableSources) {
      await sourceStorage.delete(source.key);
      expiredSourceFilesDeleted += 1;
    }

    for (const file of deletableOutputs) {
      await outputStorage.delete(file.key);
      await prismaClient.conversionFile.updateMany({
        data: { deletedAt: now },
        where: { storageKey: file.key }
      });
      expiredOutputFilesDeleted += 1;
    }

    sourcePartialsDeleted = await sourceStorage.cleanupPartials();
    outputPartialsDeleted = await outputStorage.cleanupPartials();
    const expired = await prismaClient.conversion.updateMany({
      data: { status: "EXPIRED" },
      where: {
        expiresAt: { lte: now },
        status: "COMPLETED"
      }
    });
    completedConversionsExpired = expired.count;
  } else {
    completedConversionsExpired = await prismaClient.conversion.count({
      where: {
        expiresAt: { lte: now },
        status: "COMPLETED"
      }
    });
  }

  return {
    completedConversionsExpired,
    dryRun,
    expiredOutputFilesDeleted,
    expiredOutputFilesFound: expiredOutputs.length,
    expiredSourceFilesDeleted,
    expiredSourceFilesFound: expiredSources.length,
    outputPartialsDeleted,
    sourcePartialsDeleted
  };
}

function emptyCleanupReport(dryRun: boolean): CleanupReport {
  return {
    completedConversionsExpired: 0,
    dryRun,
    expiredOutputFilesDeleted: 0,
    expiredOutputFilesFound: 0,
    expiredSourceFilesDeleted: 0,
    expiredSourceFilesFound: 0,
    outputPartialsDeleted: 0,
    sourcePartialsDeleted: 0
  };
}

async function tryAcquireCleanupLock(prismaClient: PrismaClient): Promise<boolean> {
  const rows = await prismaClient.$queryRaw<{ locked: boolean }[]>`
    SELECT pg_try_advisory_lock(47291033) AS locked
  `;
  return rows[0]?.locked === true;
}

async function releaseCleanupLock(prismaClient: PrismaClient): Promise<void> {
  await prismaClient.$queryRaw`
    SELECT pg_advisory_unlock(47291033)
  `;
}
