import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 環境変数を取得し、余分な文字を削除
const getEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing ${key}`);
  }
  // 改行、空白、余分な文字を削除
  return value.trim().split(/\s+/)[0].split("\n")[0].split("\r")[0];
};

const supabaseUrl = getEnvVar("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY");

let browserClient: SupabaseClient | null = null;

export const supabaseBrowserClient = (): SupabaseClient => {
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

