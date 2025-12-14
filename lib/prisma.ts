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
    // Vercelのサーバーレス環境では、接続プールの設定を最小限に
    // SSL設定は接続文字列のsslmode=requireで処理される
    const poolConfig: any = {
      connectionString,
      max: 1, // サーバーレス環境では接続数を最小限に
      min: 0, // 最小接続数を0に設定（コールドスタート時の接続を防ぐ）
      idleTimeoutMillis: 20000, // アイドルタイムアウトを短く設定
      connectionTimeoutMillis: 10000, // 接続タイムアウトを10秒に設定
      // 接続文字列にsslmodeが含まれている場合、pgのPoolのssl設定は不要
      // 含まれていない場合のみ、明示的にSSL設定を追加
      ...(connectionString.includes("sslmode=") 
        ? {} 
        : {
            ssl: {
              rejectUnauthorized: false, // Supabaseの証明書を信頼
            },
          }
      ),
    };
    
    console.log("🔌 Creating database connection pool", {
      hasSslModeInUrl: connectionString.includes("sslmode="),
      hasExplicitSsl: !connectionString.includes("sslmode="),
      host: connectionString.match(/@([^:]+)/)?.[1] || "unknown",
    });
    
    pool = new Pool(poolConfig);
    adapter = new PrismaPg(pool);
    
    // グローバル変数に保存（再利用のため）
    globalForPrisma.pool = pool;
    globalForPrisma.adapter = adapter;
    
    // 接続エラーのハンドリングを追加
    pool.on("error", (err: Error) => {
      console.error("❌ Unexpected error on idle database client:", err);
    });
    
    // 接続をテスト（非同期、エラーはログのみ）
    pool.query("SELECT 1")
      .then(() => {
        console.log("✅ Database connection test successful");
      })
      .catch((err: any) => {
        console.error("❌ Database connection test failed:", err.message);
        console.error("Error code:", err.code);
        console.error("Connection string host:", connectionString.match(/@([^:]+)/)?.[1] || "unknown");
      });
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
}

