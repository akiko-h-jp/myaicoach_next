"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowserClient } from "@/lib/supabase-client";

type SessionData = {
  email: string | null;
};

export default function Home() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setError(error.message);
          setSession(null);
        } else {
          setSession({
            email: data.session?.user.email ?? null,
          });
        }
      } catch (e) {
        console.error("Failed to fetch session:", e);
        setError("セッションの取得に失敗しました。環境変数の設定を確認してください。");
        setSession(null);
      } finally {
        setLoading(false);
      }
    };
    // run once on mount (supabase client is now singleton)
    fetchSession();
  }, [supabase]);

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);
    await supabase.auth.signOut();
    setSession(null);
    setLoading(false);
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-100 via-sky-200 to-sky-300 flex items-center justify-center px-3 sm:px-4 py-4 sm:py-8">
      <div className="w-full max-w-md rounded-xl bg-white/90 backdrop-blur-sm p-4 sm:p-6 shadow-xl border border-sky-200/50">
        <h1 className="text-xl sm:text-2xl font-semibold mb-4 text-center text-gray-900">Home</h1>
        {loading && <p className="text-sm text-gray-500">読み込み中...</p>}
        {!loading && error && (
          <p className="text-sm text-red-600">エラー: {error}</p>
        )}
        {!loading && !session?.email && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              未ログインです。ログイン画面へ移動してください。
            </p>
            <Link
              href="/login"
              className="block text-center rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              ログインページへ
            </Link>
          </div>
        )}
        {!loading && session?.email && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              ログイン中: <span className="font-semibold">{session.email}</span>
            </p>
            <button
              onClick={handleSignOut}
              className="w-full rounded bg-gray-800 px-4 py-2 text-white hover:bg-gray-900 disabled:opacity-60"
              disabled={loading}
            >
              サインアウト
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
