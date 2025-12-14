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

// DATABASE_URLのsslmode設定を調整
// Supabaseの自己署名証明書を信頼するため、sslmode=preferを使用
// または接続文字列からsslmodeを削除して、pgのPoolのSSL設定に任せる
if (connectionString.includes("sslmode=")) {
  // 既存のsslmode設定を削除（pgのPoolのSSL設定を使用するため）
  connectionString = connectionString.replace(/[?&]sslmode=[^&]*/g, "");
  // クエリパラメータが空になった場合、?を削除
  connectionString = connectionString.replace(/\?$/, "");
  console.log("🔧 Removed sslmode from DATABASE_URL (using pg Pool SSL config instead)");
}

// 接続タイムアウトを明示的に設定（Vercelのサーバーレス環境用）
if (!connectionString.includes("connect_timeout=")) {
  const separator = connectionString.includes("?") ? "&" : "?";
  connectionString = `${connectionString}${separator}connect_timeout=30`;
  console.log("🔧 Added connect_timeout=30 to DATABASE_URL");
}

// 接続文字列の形式を検証
if (!connectionString.startsWith("postgresql://") && !connectionString.startsWith("postgres://")) {
  console.error("❌ Invalid DATABASE_URL format. Expected postgresql:// or postgres://");
  throw new Error("DATABASE_URL must start with postgresql:// or postgres://");
}

// 接続プーラー経由かどうかをチェック
const isUsingPooler = connectionString.includes("pooler.supabase.com") || 
                      connectionString.includes(":6543"); // 接続プーラーのポート

console.log("🔍 DATABASE_URL format check:", {
  hasSslMode: connectionString.includes("sslmode="),
  startsWithPostgres: connectionString.startsWith("postgres"),
  hostPreview: connectionString.match(/@([^:]+)/)?.[1] || "unknown",
  isUsingPooler: isUsingPooler,
  port: connectionString.match(/:(\d+)/)?.[1] || "unknown",
});

// 接続プーラーを使用していない場合、警告を表示
if (!isUsingPooler && process.env.VERCEL) {
  console.warn("⚠️  WARNING: Not using Supabase connection pooler!");
  console.warn("   For Vercel serverless, connection pooler is recommended.");
  console.warn("   Use connection string from: Supabase Dashboard → Settings → Database → Connection Pooling");
  console.warn("   Format: postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres");
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
    // Vercelのサーバーレス環境では、接続プールの設定を最小限に
    // SSL設定は接続文字列のsslmode=requireで処理される
    const poolConfig: any = {
      connectionString,
      max: 1, // サーバーレス環境では接続数を最小限に
      min: 0, // 最小接続数を0に設定（コールドスタート時の接続を防ぐ）
      idleTimeoutMillis: 30000, // アイドルタイムアウトを30秒に設定
      connectionTimeoutMillis: 30000, // 接続タイムアウトを30秒に延長（Vercelのサーバーレス環境用）
      // Supabaseの証明書を信頼する設定（P1011エラーを回避）
      // 接続文字列のsslmode設定に関係なく、明示的にSSL設定を追加
      ssl: {
        rejectUnauthorized: false, // Supabaseの自己署名証明書を信頼
      },
    };
    
    console.log("🔌 Creating database connection pool", {
      hasSslModeInUrl: connectionString.includes("sslmode="),
      hasExplicitSsl: true, // 常にpgのPoolのSSL設定を使用
      host: connectionString.match(/@([^:]+)/)?.[1] || "unknown",
      sslConfig: poolConfig.ssl,
    });
    
    pool = new Pool(poolConfig);
    adapter = new PrismaPg(pool);
    
    // グローバル変数に保存（再利用のため）
    globalForPrisma.pool = pool;
    globalForPrisma.adapter = adapter;
    
    // 接続エラーのハンドリングを追加
    pool.on("error", (err: Error) => {
      console.error("❌ Unexpected error on idle database client:", err);
      console.error("Error details:", {
        message: err.message,
        code: (err as any).code,
        stack: err.stack,
      });
    });
    
    // 接続イベントのログを追加（デバッグ用）
    pool.on("connect", () => {
      console.log("✅ New database connection established");
    });
    
    pool.on("acquire", () => {
      console.log("📥 Connection acquired from pool");
    });
    
    pool.on("release", () => {
      console.log("📤 Connection released to pool");
    });
    
    // ビルド時（静的生成時）には接続テストを実行しない
    // Vercelのビルド環境では、データベースへの接続ができない場合がある（特にIPv6接続）
    // ランタイム（APIリクエスト時）にのみ接続が確立される
    const isBuildTime = process.env.NEXT_PHASE === "phase-production-build" || 
                        process.env.NEXT_PHASE === "phase-development";
    
    if (!isBuildTime) {
      // ランタイム時のみ接続をテスト（非同期、エラーはログのみ）
      // 実際のAPIリクエスト時に接続が確立される
      pool.query("SELECT 1")
        .then(() => {
          console.log("✅ Database connection test successful");
        })
        .catch((err: any) => {
          // ビルド時のエラーは無視（ランタイムで再試行される）
          if (err.code !== "ENETUNREACH") {
            console.error("❌ Database connection test failed:", err.message);
            console.error("Error code:", err.code);
            console.error("Connection string host:", connectionString.match(/@([^:]+)/)?.[1] || "unknown");
          }
        });
    }
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

