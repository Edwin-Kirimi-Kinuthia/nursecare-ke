import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  careboraPrisma?: PrismaClient;
};

function getClient(): PrismaClient {
  if (!globalForPrisma.careboraPrisma) {
    globalForPrisma.careboraPrisma = new PrismaClient();
  }
  return globalForPrisma.careboraPrisma;
}

/**
 * Lazily-constructed, hot-reload-safe Prisma client.
 *
 * Construction is deferred to first use (via the Proxy) so importing this package
 * never requires DATABASE_URL at build time — it only connects on the first query.
 * The instance is cached on globalThis to avoid exhausting connections during
 * Next.js dev hot-reloads.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

// Re-export generated enums & types (UserRole, Prisma, model types, …).
export * from "@prisma/client";
