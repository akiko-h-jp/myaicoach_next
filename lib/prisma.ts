import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  const error = new Error("DATABASE_URL is not set. Please check your environment variables.");
  console.error("❌ Prisma initialization error:", error.message);
  throw error;
}

// サーバーレス環境での接続プール管理を改善
// Vercelなどのサーバーレス環境では、グローバル変数を使用して接続を再利用
const globalForPrisma = global as unknown as { 
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
  adapter: PrismaPg | undefined;
};

// 接続プールを再利用（サーバーレス環境での接続リークを防ぐ）
let pool: Pool;
let adapter: PrismaPg;

if (globalForPrisma.pool && globalForPrisma.adapter) {
  // 既存の接続プールとアダプターを再利用
  pool = globalForPrisma.pool;
  adapter = globalForPrisma.adapter;
} else {
  // 新しい接続プールとアダプターを作成
  try {
    // SSL接続を強制（Supabaseでは必須）
    const poolConfig: any = {
      connectionString,
      max: 1, // サーバーレス環境では接続数を最小限に
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
    
    // DATABASE_URLにssl設定が含まれていない場合、追加
    if (!connectionString.includes("sslmode=")) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }
    
    pool = new Pool(poolConfig);
    adapter = new PrismaPg(pool);
    
    // グローバル変数に保存（再利用のため）
    globalForPrisma.pool = pool;
    globalForPrisma.adapter = adapter;
  } catch (error: any) {
    console.error("❌ Failed to create Prisma adapter:", error.message);
    throw new Error(`Failed to initialize database connection: ${error.message}`);
  }
}

// PrismaClientのインスタンスを再利用
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
  
  // 初期化時に接続をテスト（サーバーレス環境では初回リクエスト時のみ実行）
  if (process.env.NODE_ENV === "production") {
    // 非同期で接続をテスト（エラーはログに記録するだけ）
    prisma.$connect()
      .then(() => {
        console.log("✅ Prisma client connected successfully");
      })
      .catch((error: any) => {
        console.error("❌ Prisma client connection failed:", error.message);
        console.error("Connection string preview:", connectionString.substring(0, 20) + "...");
      });
  }
}

