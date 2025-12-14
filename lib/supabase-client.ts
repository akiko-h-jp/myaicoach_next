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

const supabaseUrl = getEnvVarSafe("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnvVarSafe("NEXT_PUBLIC_SUPABASE_ANON_KEY");

// デバッグ用: 環境変数が読み込まれているか確認（本番環境では表示されない）
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.log("Environment variables check:", {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlLength: supabaseUrl?.length || 0,
    keyLength: supabaseAnonKey?.length || 0,
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== "undefined") {
    console.error("Supabase environment variables are missing or invalid");
    console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "exists" : "missing");
    console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? "exists" : "missing");
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

