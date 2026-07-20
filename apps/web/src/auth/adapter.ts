import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@html2pdf-pro/database";
import type { PrismaClient } from "@html2pdf-pro/database";
import type { Adapter, AdapterAccount, AdapterSession, AdapterUser } from "next-auth/adapters";

type DatabaseUser = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
};

type DatabaseAccount = {
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
};

type DatabaseSession = {
  sessionToken: string;
  userId: string;
  expires: Date;
};

function toAdapterUser(user: DatabaseUser): AdapterUser {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    image: null,
    name: user.name
  };
}

function toAdapterAccount(account: DatabaseAccount): AdapterAccount {
  return {
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    type: account.type as AdapterAccount["type"],
    userId: account.userId
  };
}

function toAdapterSession(session: DatabaseSession): AdapterSession {
  return {
    expires: session.expires,
    sessionToken: session.sessionToken,
    userId: session.userId
  };
}

/**
 * Adapts Auth.js records to the existing schema while deliberately excluding
 * provider tokens and preventing session expiry from sliding on access.
 */
export function createAuthAdapter(client: PrismaClient = prisma): Adapter {
  const baseAdapter = PrismaAdapter(client);

  return {
    ...baseAdapter,
    async createUser(user) {
      const created = await client.user.create({
        data: {
          authProvisioning: true,
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.name
        }
      });

      return toAdapterUser(created);
    },
    async getUser(id) {
      const user = await client.user.findUnique({ where: { id } });
      return user ? toAdapterUser(user) : null;
    },
    async getUserByEmail(email) {
      const user = await client.user.findUnique({ where: { email } });
      return user ? toAdapterUser(user) : null;
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const account = await client.account.findUnique({
        include: { user: true },
        where: {
          provider_providerAccountId: { provider, providerAccountId }
        }
      });

      return account ? toAdapterUser(account.user) : null;
    },
    async updateUser(user) {
      const data: {
        email?: string;
        emailVerified?: Date | null;
        name?: string | null;
      } = {};

      if (user.email !== undefined) data.email = user.email;
      if (user.emailVerified !== undefined) data.emailVerified = user.emailVerified;
      if (user.name !== undefined) data.name = user.name;

      const updated = await client.user.update({ where: { id: user.id }, data });
      return toAdapterUser(updated);
    },
    async deleteUser(userId) {
      const deleted = await client.user.delete({ where: { id: userId } });
      return toAdapterUser(deleted);
    },
    async linkAccount(account) {
      try {
        const linked = await client.$transaction(async (transaction) => {
          const created = await transaction.account.create({
            data: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              type: account.type,
              userId: account.userId
            }
          });

          await transaction.user.updateMany({
            data: { authProvisioning: false },
            where: { authProvisioning: true, id: account.userId }
          });

          return created;
        });

        return toAdapterAccount(linked);
      } catch (linkError) {
        try {
          await client.user.deleteMany({
            where: {
              accounts: { none: {} },
              authProvisioning: true,
              id: account.userId
            }
          });
        } catch (recoveryError) {
          throw new AggregateError(
            [linkError, recoveryError],
            "Account linking failed and provisional-user recovery did not complete."
          );
        }

        throw linkError;
      }
    },
    async unlinkAccount({ provider, providerAccountId }) {
      const deleted = await client.account.delete({
        where: {
          provider_providerAccountId: { provider, providerAccountId }
        }
      });

      return toAdapterAccount(deleted);
    },
    async getAccount(providerAccountId, provider) {
      const account = await client.account.findUnique({
        where: {
          provider_providerAccountId: { provider, providerAccountId }
        }
      });

      return account ? toAdapterAccount(account) : null;
    },
    async createSession(session) {
      const created = await client.session.create({ data: session });
      return toAdapterSession(created);
    },
    async getSessionAndUser(sessionToken) {
      const record = await client.session.findUnique({
        include: { user: true },
        where: { sessionToken }
      });

      if (!record) return null;

      return {
        session: toAdapterSession(record),
        user: toAdapterUser(record.user)
      };
    },
    async updateSession({ sessionToken }) {
      const existing = await client.session.findUnique({ where: { sessionToken } });
      return existing ? toAdapterSession(existing) : null;
    },
    async deleteSession(sessionToken) {
      const deleted = await client.session.delete({ where: { sessionToken } });
      return toAdapterSession(deleted);
    }
  };
}
