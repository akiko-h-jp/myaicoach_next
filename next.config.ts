import type { NextConfig } from "next";

// ビルド時に環境変数を検証
const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

// サーバーサイドの環境変数（ビルド時には存在しない可能性があるため、警告のみ）
const serverEnvVars = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

console.log("🔍 Checking environment variables at build time...");
requiredEnvVars.forEach((key) => {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    console.error(`❌ Missing: ${key}`);
  } else {
    console.log(`✅ Found: ${key} (length: ${value.length})`);
    // 値の最初の20文字だけを表示（セキュリティのため）
    const preview = value.length > 20 ? value.substring(0, 20) + "..." : value;
    console.log(`   Preview: ${preview}`);
  }
});

const missingEnvVars = requiredEnvVars.filter(
  (key) => !process.env[key] || process.env[key]?.trim() === ""
);

if (missingEnvVars.length > 0) {
  console.error("\n❌ Missing required environment variables:");
  missingEnvVars.forEach((key) => {
    console.error(`   - ${key}`);
  });
  console.error("\n⚠️  Build will continue, but the app may not work correctly.");
  console.error("💡 Please check Vercel environment variables settings.");
} else {
  console.log("\n✅ All required client-side environment variables are present!");
}

// サーバーサイドの環境変数をチェック（警告のみ）
console.log("\n🔍 Checking server-side environment variables...");
serverEnvVars.forEach((key) => {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    console.warn(`⚠️  Missing server-side env var: ${key} (will be checked at runtime)`);
  } else {
    console.log(`✅ Found: ${key} (length: ${value.length})`);
  }
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
