import type { PrismaClient } from "@html2pdf-pro/database";
import type { AdapterAccount } from "next-auth/adapters";
import { describe, expect, it, vi } from "vitest";
import { createAuthAdapter } from "./adapter";

function createClient() {
  const client = {
    $transaction: vi.fn(),
    account: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn()
    },
    session: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    user: {
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    },
    verificationToken: {
      create: vi.fn(),
      delete: vi.fn()
    }
  };

  client.$transaction.mockImplementation(
    async (operation: (transaction: typeof client) => Promise<unknown>) => operation(client)
  );

  return client;
}

describe("Auth.js Prisma adapter boundary", () => {
  it("creates the internal user without persisting unsupported profile fields", async () => {
    const client = createClient();
    const created = {
      email: "user@example.com",
      emailVerified: new Date("2026-07-20T00:00:00.000Z"),
      id: "user-1",
      name: "Example User"
    };
    client.user.create.mockResolvedValue(created);
    const adapter = createAuthAdapter(client as unknown as PrismaClient);

    const user = await adapter.createUser?.({
      ...created,
      image: "https://example.com/avatar.png"
    });

    expect(client.user.create).toHaveBeenCalledWith({
      data: {
        authProvisioning: true,
        email: created.email,
        emailVerified: created.emailVerified,
        name: created.name
      }
    });
    expect(user).toEqual({ ...created, image: null });
  });

  it("maps a Google account without retaining provider tokens", async () => {
    const client = createClient();
    client.account.create.mockResolvedValue({
      provider: "google",
      providerAccountId: "google-subject",
      type: "oidc",
      userId: "user-1"
    });
    const adapter = createAuthAdapter(client as unknown as PrismaClient);
    const account: AdapterAccount = {
      access_token: "access-secret",
      id_token: "identity-secret",
      provider: "google",
      providerAccountId: "google-subject",
      refresh_token: "refresh-secret",
      type: "oidc",
      userId: "user-1"
    };

    await adapter.linkAccount?.(account);

    expect(client.account.create).toHaveBeenCalledWith({
      data: {
        provider: "google",
        providerAccountId: "google-subject",
        type: "oidc",
        userId: "user-1"
      }
    });
    expect(client.user.updateMany).toHaveBeenCalledWith({
      data: { authProvisioning: false },
      where: { authProvisioning: true, id: "user-1" }
    });
  });

  it("removes only the provisional user when account linking fails", async () => {
    const client = createClient();
    const linkError = new Error("provider account conflict");
    client.account.create.mockRejectedValue(linkError);
    client.user.deleteMany.mockResolvedValue({ count: 1 });
    const adapter = createAuthAdapter(client as unknown as PrismaClient);
    const account: AdapterAccount = {
      provider: "google",
      providerAccountId: "google-subject",
      type: "oidc",
      userId: "provisional-user"
    };

    await expect(adapter.linkAccount?.(account)).rejects.toBe(linkError);

    expect(client.user.deleteMany).toHaveBeenCalledWith({
      where: {
        accounts: { none: {} },
        authProvisioning: true,
        id: "provisional-user"
      }
    });
  });

  it("preserves the original absolute session expiry on update", async () => {
    const client = createClient();
    const existing = {
      expires: new Date("2026-08-19T00:00:00.000Z"),
      sessionToken: "session-token",
      userId: "user-1"
    };
    client.session.findUnique.mockResolvedValue(existing);
    const adapter = createAuthAdapter(client as unknown as PrismaClient);

    const session = await adapter.updateSession?.({
      expires: new Date("2026-09-18T00:00:00.000Z"),
      sessionToken: existing.sessionToken
    });

    expect(client.session.update).not.toHaveBeenCalled();
    expect(session).toEqual(existing);
  });

  it("revokes only the identified current session", async () => {
    const client = createClient();
    const deleted = {
      expires: new Date("2026-08-19T00:00:00.000Z"),
      sessionToken: "current-session",
      userId: "user-1"
    };
    client.session.delete.mockResolvedValue(deleted);
    const adapter = createAuthAdapter(client as unknown as PrismaClient);

    await adapter.deleteSession?.("current-session");

    expect(client.session.delete).toHaveBeenCalledOnce();
    expect(client.session.delete).toHaveBeenCalledWith({
      where: { sessionToken: "current-session" }
    });
  });
});
