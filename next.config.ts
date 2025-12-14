import type { NextConfig } from "next";

// ビルド時に環境変数を検証
const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const missingEnvVars = requiredEnvVars.filter(
  (key) => !process.env[key] || process.env[key]?.trim() === ""
);

if (missingEnvVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingEnvVars.forEach((key) => {
    console.error(`   - ${key}`);
  });
  console.error("\n⚠️  Build will continue, but the app may not work correctly.");
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
