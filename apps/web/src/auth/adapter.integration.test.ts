// @vitest-environment node

import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@html2pdf-pro/database";
import type { AdapterAccount, AdapterUser } from "next-auth/adapters";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuthAdapter } from "./adapter";

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const prismaSchemaPath = path.join(
  repositoryRoot,
  "packages",
  "database",
  "prisma",
  "schema.prisma"
);
const prismaCliPath = path.join(repositoryRoot, "node_modules", "prisma", "build", "index.js");
const schemaName = `auth_integration_${process.pid}_${randomBytes(6).toString("hex")}`;

let database: PrismaClient;
let isolatedDatabaseUrl: string;
let administrationDatabaseUrl: string;

function requireIntegrationDatabaseUrl(): string {
  const configured = process.env.AUTH_INTEGRATION_DATABASE_URL;

  if (!configured) {
    throw new Error(
      "AUTH_INTEGRATION_DATABASE_URL is required; authentication integration tests never use the development DATABASE_URL."
    );
  }

  const parsed = new URL(configured);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("AUTH_INTEGRATION_DATABASE_URL must identify PostgreSQL.");
  }

  return configured;
}

function databaseUrlForSchema(baseUrl: string, schema: string): string {
  const parsed = new URL(baseUrl);
  parsed.searchParams.set("schema", schema);
  return parsed.toString();
}

function deployRepositoryMigrations(databaseUrl: string): void {
  const result = spawnSync(
    process.execPath,
    [prismaCliPath, "migrate", "deploy", "--schema", prismaSchemaPath],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: databaseUrl }
    }
  );

  if (result.status !== 0) {
    throw new Error(`Repository migration deployment failed: ${result.stderr || result.stdout}`);
  }
}

async function createProvisionalUser(email: string): Promise<AdapterUser> {
  const adapter = createAuthAdapter(database);
  const user = await adapter.createUser?.({
    email,
    emailVerified: new Date(),
    id: "adapter-generated",
    image: null,
    name: "Integration User"
  });

  if (!user) throw new Error("Adapter did not create a provisional user.");
  return user;
}

async function provisionGoogleIdentity(
  email: string,
  providerAccountId: string,
  afterLookup?: () => Promise<void>
): Promise<AdapterUser> {
  const adapter = createAuthAdapter(database);
  const existing = await adapter.getUserByAccount?.({ provider: "google", providerAccountId });

  await afterLookup?.();

  if (existing) return existing;

  const user = await adapter.createUser?.({
    email,
    emailVerified: new Date(),
    id: "adapter-generated",
    image: null,
    name: "Concurrent Integration User"
  });

  if (!user) throw new Error("Adapter did not create a user during first-login provisioning.");

  await adapter.linkAccount?.(googleAccount(user.id, providerAccountId));
  return user;
}

function createBarrier(participantCount: number): () => Promise<void> {
  let arrived = 0;
  let release!: () => void;
  const allArrived = new Promise<void>((resolve) => {
    release = resolve;
  });

  return async () => {
    arrived += 1;
    if (arrived === participantCount) release();
    await allArrived;
  };
}

function googleAccount(userId: string, providerAccountId: string): AdapterAccount {
  return {
    access_token: "must-not-be-persisted-access-token",
    expires_at: 2_000_000_000,
    id_token: "must-not-be-persisted-id-token",
    provider: "google",
    providerAccountId,
    refresh_token: "must-not-be-persisted-refresh-token",
    token_type: "bearer",
    type: "oidc",
    userId
  };
}

async function seedLinkedUser(label: string, providerAccountId: string) {
  return database.user.create({
    data: {
      accounts: {
        create: {
          provider: "google",
          providerAccountId,
          type: "oidc"
        }
      },
      email: `${label}-${schemaName}@example.test`,
      name: label
    }
  });
}

beforeAll(async () => {
  const baseUrl = requireIntegrationDatabaseUrl();
  administrationDatabaseUrl = databaseUrlForSchema(baseUrl, "public");
  isolatedDatabaseUrl = databaseUrlForSchema(baseUrl, schemaName);

  const administrator = new PrismaClient({ datasourceUrl: administrationDatabaseUrl });
  try {
    await administrator.$executeRawUnsafe(`CREATE SCHEMA "${schemaName}"`);
  } finally {
    await administrator.$disconnect();
  }

  deployRepositoryMigrations(isolatedDatabaseUrl);
  database = new PrismaClient({ datasourceUrl: isolatedDatabaseUrl });
  await database.$connect();
}, 30_000);

afterAll(async () => {
  await database?.$disconnect();

  if (administrationDatabaseUrl) {
    const administrator = new PrismaClient({ datasourceUrl: administrationDatabaseUrl });
    try {
      await administrator.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    } finally {
      await administrator.$disconnect();
    }
  }
}, 30_000);

describe("Auth.js provisioning with PostgreSQL", () => {
  it("removes only a provisional user when account linking fails", async () => {
    const providerAccountId = `occupied-${schemaName}`;
    const existing = await seedLinkedUser("existing", providerAccountId);
    const provisional = await createProvisionalUser(`provisional-${schemaName}@example.test`);
    const adapter = createAuthAdapter(database);

    await expect(
      adapter.linkAccount?.(googleAccount(provisional.id, providerAccountId))
    ).rejects.toThrow();

    await expect(database.user.findUnique({ where: { id: provisional.id } })).resolves.toBeNull();
    await expect(database.user.findUnique({ where: { id: existing.id } })).resolves.toMatchObject({
      id: existing.id
    });
  });

  it("allows a clean retry after failed provisional-user recovery", async () => {
    const providerAccountId = `retry-${schemaName}`;
    const occupied = await seedLinkedUser("retry-owner", providerAccountId);
    const email = `retry-provisional-${schemaName}@example.test`;
    const firstAttempt = await createProvisionalUser(email);
    const adapter = createAuthAdapter(database);

    await expect(
      adapter.linkAccount?.(googleAccount(firstAttempt.id, providerAccountId))
    ).rejects.toThrow();
    await database.account.deleteMany({ where: { userId: occupied.id } });

    const retry = await createProvisionalUser(email);
    await expect(
      adapter.linkAccount?.(googleAccount(retry.id, providerAccountId))
    ).resolves.toMatchObject({
      userId: retry.id
    });
    await expect(database.user.findUnique({ where: { id: retry.id } })).resolves.toMatchObject({
      authProvisioning: false
    });
  });

  it("produces one valid mapping during complete concurrent first-login flows", async () => {
    const providerAccountId = `concurrent-${schemaName}`;
    const email = `concurrent-${schemaName}@example.test`;
    const afterLookup = createBarrier(2);

    const outcomes = await Promise.allSettled([
      provisionGoogleIdentity(email, providerAccountId, afterLookup),
      provisionGoogleIdentity(email, providerAccountId, afterLookup)
    ]);

    expect(outcomes.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter(({ status }) => status === "rejected")).toHaveLength(1);

    const users = await database.user.findMany({ where: { email } });
    const accounts = await database.account.findMany({
      where: { provider: "google", providerAccountId }
    });

    expect(users).toHaveLength(1);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.userId).toBe(users[0]?.id);
    expect(users[0]?.authProvisioning).toBe(false);
    await expect(database.user.count({ where: { authProvisioning: true, email } })).resolves.toBe(
      0
    );

    const retry = await provisionGoogleIdentity(email, providerAccountId);
    expect(retry.id).toBe(users[0]?.id);
    await expect(database.user.count({ where: { email } })).resolves.toBe(1);
    await expect(
      database.account.count({ where: { provider: "google", providerAccountId } })
    ).resolves.toBe(1);
  });

  it("preserves an existing migrated user when linking fails", async () => {
    const providerAccountId = `migrated-conflict-${schemaName}`;
    await seedLinkedUser("migrated-conflict-owner", providerAccountId);
    const migrated = await database.user.create({
      data: { email: `migrated-${schemaName}@example.test`, name: "Migrated User" }
    });
    const adapter = createAuthAdapter(database);

    await expect(
      adapter.linkAccount?.(googleAccount(migrated.id, providerAccountId))
    ).rejects.toThrow();
    await expect(database.user.findUnique({ where: { id: migrated.id } })).resolves.toMatchObject({
      authProvisioning: false,
      id: migrated.id
    });
  });

  it("preserves a user that already has a linked account when another link fails", async () => {
    const existing = await seedLinkedUser(
      `linked-user-${schemaName}`,
      `existing-link-${schemaName}`
    );
    const occupiedProviderAccountId = `linked-conflict-${schemaName}`;
    await seedLinkedUser("linked-conflict-owner", occupiedProviderAccountId);
    const adapter = createAuthAdapter(database);

    await expect(
      adapter.linkAccount?.(googleAccount(existing.id, occupiedProviderAccountId))
    ).rejects.toThrow();
    await expect(database.user.findUnique({ where: { id: existing.id } })).resolves.toMatchObject({
      id: existing.id
    });
    await expect(database.account.count({ where: { userId: existing.id } })).resolves.toBe(1);
  });

  it("rolls back account creation when provisioning finalization fails", async () => {
    const functionName = `reject_auth_activation_${process.pid}`;
    const triggerName = `reject_auth_activation_${process.pid}`;
    const provisional = await createProvisionalUser(`rollback-${schemaName}@example.test`);
    const providerAccountId = `rollback-${schemaName}`;
    const adapter = createAuthAdapter(database);

    await database.$executeRawUnsafe(`
      CREATE FUNCTION "${schemaName}"."${functionName}"() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'forced integration-test rollback';
      END;
      $$ LANGUAGE plpgsql
    `);
    await database.$executeRawUnsafe(`
      CREATE TRIGGER "${triggerName}"
      BEFORE UPDATE OF "authProvisioning" ON "${schemaName}"."User"
      FOR EACH ROW
      WHEN (OLD."authProvisioning" = true AND NEW."authProvisioning" = false)
      EXECUTE FUNCTION "${schemaName}"."${functionName}"()
    `);

    try {
      await expect(
        adapter.linkAccount?.(googleAccount(provisional.id, providerAccountId))
      ).rejects.toThrow("forced integration-test rollback");
    } finally {
      await database.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS "${triggerName}" ON "${schemaName}"."User"`
      );
      await database.$executeRawUnsafe(
        `DROP FUNCTION IF EXISTS "${schemaName}"."${functionName}"()`
      );
    }

    await expect(
      database.account.count({ where: { provider: "google", providerAccountId } })
    ).resolves.toBe(0);
    await expect(database.user.findUnique({ where: { id: provisional.id } })).resolves.toBeNull();
  });

  it("does not persist provider tokens", async () => {
    const user = await createProvisionalUser(`token-free-${schemaName}@example.test`);
    const providerAccountId = `token-free-${schemaName}`;
    const adapter = createAuthAdapter(database);

    await adapter.linkAccount?.(googleAccount(user.id, providerAccountId));

    await expect(
      database.account.findUnique({
        where: { provider_providerAccountId: { provider: "google", providerAccountId } }
      })
    ).resolves.toMatchObject({
      accessToken: null,
      expiresAt: null,
      idToken: null,
      refreshToken: null,
      sessionState: null,
      tokenType: null
    });
  });
});
