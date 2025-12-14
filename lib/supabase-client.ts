import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 環境変数を取得し、余分な文字を削除
const getEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    if (typeof window !== "undefined") {
      console.error(`Missing environment variable: ${key}`);
    }
    throw new Error(`Missing ${key}`);
  }
  // 改行、空白、余分な文字を削除
  const cleaned = value.trim().split(/\s+/)[0].split("\n")[0].split("\r")[0];
  // NEXTAUTH_URLなどの環境変数が混入していないか確認
  if (cleaned.includes("NEXTAUTH_URL") || cleaned.includes("=")) {
    // 等号が含まれている場合は、等号より前の部分のみを取得
    const beforeEquals = cleaned.split("=")[0];
    if (beforeEquals.length > 0 && beforeEquals !== cleaned) {
      console.warn(`Environment variable ${key} contains unexpected characters, using first part only`);
      return beforeEquals;
    }
  }
  return cleaned;
};

// 環境変数を安全に取得（エラー時は空文字列を返す）
const getEnvVarSafe = (key: string): string => {
  try {
    return getEnvVar(key);
  } catch (e) {
    if (typeof window !== "undefined") {
      console.error(`Failed to get environment variable ${key}:`, e);
    }
    return "";
  }
};

// 環境変数を直接取得（ビルド時に埋め込まれる）
const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKeyRaw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// クリーンアップ処理（直接値をクリーンアップ、getEnvVarSafeは使わない）
const cleanValue = (value: string | undefined): string => {
  if (!value) return "";
  // 改行、空白、余分な文字を削除
  const cleaned = value.trim().split(/\s+/)[0].split("\n")[0].split("\r")[0];
  // NEXTAUTH_URLなどの環境変数が混入していないか確認
  if (cleaned.includes("NEXTAUTH_URL") || (cleaned.includes("=") && !cleaned.startsWith("http"))) {
    // 等号が含まれている場合は、等号より前の部分のみを取得（URLの場合は除く）
    const beforeEquals = cleaned.split("=")[0];
    if (beforeEquals.length > 0 && beforeEquals !== cleaned && !cleaned.startsWith("http")) {
      return beforeEquals;
    }
  }
  return cleaned;
};

const supabaseUrl = cleanValue(supabaseUrlRaw);
const supabaseAnonKey = cleanValue(supabaseAnonKeyRaw);

// デバッグ用: 環境変数が読み込まれているか確認（常に表示）
if (typeof window !== "undefined") {
  console.log("🔍 Environment variables check:", {
    rawUrl: supabaseUrlRaw ? `exists (${supabaseUrlRaw.length} chars)` : "missing",
    rawKey: supabaseAnonKeyRaw ? `exists (${supabaseAnonKeyRaw.length} chars)` : "missing",
    cleanedUrl: supabaseUrl ? `exists (${supabaseUrl.length} chars)` : "missing",
    cleanedKey: supabaseAnonKey ? `exists (${supabaseAnonKey.length} chars)` : "missing",
  });
  
  if (!supabaseUrlRaw || !supabaseAnonKeyRaw) {
    console.error("❌ Environment variables are missing at build time!");
    console.error("This means the variables were not set in Vercel when the build ran.");
    console.error("Please:");
    console.error("1. Check Vercel → Settings → Environment Variables");
    console.error("2. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set");
    console.error("3. Ensure they are enabled for Production environment");
    console.error("4. Redeploy with cache cleared");
  } else if (!supabaseUrl || !supabaseAnonKey) {
    console.error("⚠️ Environment variables exist but were cleaned to empty strings");
    console.error("This might indicate the values contain unexpected characters");
  }
}

let browserClient: SupabaseClient | null = null;

export const supabaseBrowserClient = (): SupabaseClient => {
  // 環境変数が設定されていない場合の処理
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== "undefined") {
      console.error("⚠️ Supabase environment variables are not configured.");
      console.error("Missing:", {
        url: !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
        key: !supabaseAnonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
      });
      console.error("Please check Vercel environment variables settings:");
      console.error("1. Go to Vercel Dashboard → Settings → Environment Variables");
      console.error("2. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
      console.error("3. Make sure they are set for Production environment");
      console.error("4. Redeploy with cache cleared");
    }
    
    // ダミーのURLとキーでクライアントを作成（実際のAPI呼び出しは失敗するが、アプリはクラッシュしない）
    const dummyUrl = "https://placeholder.supabase.co";
    const dummyKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
    
    if (!browserClient) {
      browserClient = createClient(dummyUrl, dummyKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
    }
    return browserClient;
  }
  
  // reuse singleton to avoid recreating client every render
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
      global: {
        headers: {
          "Content-Type": "application/json",
        },
      },
    });
  }
  return browserClient;
};

