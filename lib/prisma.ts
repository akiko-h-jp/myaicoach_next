import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  const error = new Error("DATABASE_URL is not set. Please check your environment variables.");
  console.error("❌ Prisma initialization error:", error.message);
  throw error;
}

let pool: Pool;
let adapter: PrismaPg;

try {
  pool = new Pool({ connectionString });
  adapter = new PrismaPg(pool);
} catch (error: any) {
  console.error("❌ Failed to create Prisma adapter:", error.message);
  throw new Error(`Failed to initialize database connection: ${error.message}`);
}

// Avoid creating multiple PrismaClient instances in dev
const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

