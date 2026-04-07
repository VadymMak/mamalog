import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Singleton pattern — safe for serverless (Next.js, Vercel)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
