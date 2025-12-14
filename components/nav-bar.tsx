"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowserClient } from "@/lib/supabase-client";
import { useEffect, useState } from "react";

export const NavBar = () => {
  const supabase = supabaseBrowserClient();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Session fetch error:", error);
          setEmail(null);
        } else {
          setEmail(data.session?.user.email ?? null);
        }
      } catch (e) {
        console.error("Failed to fetch session:", e);
        setEmail(null);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setEmail(null);
    router.push("/login");
  };

  return (
    <header className="w-full border-b bg-white">
      <div className="mx-auto flex max-w-4xl flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-4 py-2 sm:py-3 gap-2 sm:gap-0">
        <nav className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-gray-700 flex-wrap">
          <Link href="/" className="hover:text-blue-600 px-1 py-1">
            Home
          </Link>
          <Link href="/tasks" className="hover:text-blue-600 px-1 py-1">
            Tasks
          </Link>
          <Link href="/schedule" className="hover:text-blue-600 px-1 py-1">
            Schedule
          </Link>
          <Link href="/setting" className="hover:text-blue-600 px-1 py-1">
            Setting
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-700">
          {!loading && email && <span className="text-gray-600 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{email}</span>}
          {email ? (
            <button
              onClick={handleLogout}
              className="rounded bg-gray-800 px-2 sm:px-3 py-1 text-white hover:bg-gray-900 text-xs whitespace-nowrap"
            >
              ログアウト
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded bg-blue-600 px-2 sm:px-3 py-1 text-white hover:bg-blue-700 text-xs whitespace-nowrap"
            >
              ログイン
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

