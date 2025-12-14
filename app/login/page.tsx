// Client Component because we use useState and browser-side Supabase auth
"use client";

import { supabaseBrowserClient } from "@/lib/supabase-client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    // 既存のセッションをクリア
    await supabase.auth.signOut();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    // セッションを再取得してトークンを確認
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token || typeof token !== "string") {
      setMessage("トークンの取得に失敗しました。再度お試しください。");
      setLoading(false);
      return;
    }
    // トークンに余分な文字が含まれていないか確認
    const cleanToken = token.trim().split(/\s+/)[0];
    if (cleanToken !== token) {
      setMessage("トークンに問題があります。ブラウザのキャッシュをクリアしてください。");
      setLoading(false);
      return;
    }
    setMessage("ログインしました。トップに戻ってください。");
    router.push("/");
    setLoading(false);
  };

  // If already logged-in, skip this page
  useEffect(() => {
    const checkSession = async () => {
      // まずセッションをクリアしてからチェック
      await supabase.auth.signOut();
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        router.replace("/");
      }
    };
    checkSession();
  }, [router, supabase]);

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("サインアップメールを送信しました。メールを確認してください。");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 via-sky-200 to-sky-300 px-3 sm:px-4 py-4 sm:py-8">
      <div className="w-full max-w-md rounded-xl bg-white/90 backdrop-blur-sm p-4 sm:p-6 shadow-xl border border-sky-200/50">
        <h1 className="text-xl sm:text-2xl font-semibold text-center mb-4 sm:mb-6 text-gray-900">Login / Signup</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleLogin}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60 shadow-md hover:shadow-lg transition-all font-medium text-sm sm:text-base"
              disabled={loading}
              type="submit"
            >
              ログイン
            </button>
            <button
              onClick={handleSignup}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60 shadow-md hover:shadow-lg transition-all font-medium text-sm sm:text-base"
              disabled={loading}
              type="button"
            >
              サインアップ
            </button>
          </div>
        </form>
        {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
      </div>
    </div>
  );
}

