import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  const error = new Error("DATABASE_URL is not set. Please check your environment variables.");
  console.error("❌ Prisma initialization error:", error.message);
  throw error;
}

// 接続文字列を正規化（前後の空白を削除）
connectionString = connectionString.trim();

// DATABASE_URLにsslmodeが含まれていない場合、追加
// SupabaseのPostgreSQL接続にはSSLが必須
if (!connectionString.includes("sslmode=")) {
  // 既存のクエリパラメータがあるかチェック
  const separator = connectionString.includes("?") ? "&" : "?";
  connectionString = `${connectionString}${separator}sslmode=require`;
  console.log("🔧 Added sslmode=require to DATABASE_URL");
}

// 接続文字列の形式を検証
if (!connectionString.startsWith("postgresql://") && !connectionString.startsWith("postgres://")) {
  console.error("❌ Invalid DATABASE_URL format. Expected postgresql:// or postgres://");
  throw new Error("DATABASE_URL must start with postgresql:// or postgres://");
}

console.log("🔍 DATABASE_URL format check:", {
  hasSslMode: connectionString.includes("sslmode="),
  startsWithPostgres: connectionString.startsWith("postgres"),
  hostPreview: connectionString.match(/@([^:]+)/)?.[1] || "unknown",
});

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
      connectionTimeoutMillis: 20000, // タイムアウトを延長（20秒）
      // SSL設定を明示的に指定（Supabaseでは必須）
      ssl: {
        rejectUnauthorized: false, // Supabaseの証明書を信頼
      },
    };
    
    console.log("🔌 Creating database connection pool with SSL enabled");
    
    pool = new Pool(poolConfig);
    adapter = new PrismaPg(pool);
    
    // 接続をテスト
    pool.query("SELECT 1")
      .then(() => {
        console.log("✅ Database connection test successful");
      })
      .catch((err: any) => {
        console.error("❌ Database connection test failed:", err.message);
        console.error("Connection string host:", connectionString.match(/@([^:]+)/)?.[1] || "unknown");
      });
    
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

