"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowserClient } from "@/lib/supabase-client";

type Category = {
  id: string;
  name: string;
  dailyLimitHours?: number | null;
  weekendHolidayHours?: number | null;
};

export default function SettingsPage() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [weekdayLimit, setWeekdayLimit] = useState<number | "">("");
  const [weekendLimitSetting, setWeekendLimitSetting] = useState<number | "">("");
  const [name, setName] = useState("");
  const [dailyLimit, setDailyLimit] = useState<number | "">("");
  const [weekendLimitCategory, setWeekendLimitCategory] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDaily, setEditDaily] = useState<number | "">("");
  const [editWeekend, setEditWeekend] = useState<number | "">("");

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session?.user) {
        router.replace("/login");
        return;
      }
      const token = session.access_token;
      if (!token || typeof token !== "string") {
        setError("トークンの取得に失敗しました。再度ログインしてください。");
        router.replace("/login");
        return;
      }
      setAccessToken(token);
      await fetchCategories(token);
      await fetchUserSetting(token);
      setLoading(false);
    };
    init();
  }, [router, supabase]);

  const fetchCategories = async (token: string) => {
    const res = await fetch("/api/categories", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const json = await res.json();
    setCategories(json.categories ?? []);
  };

  const fetchUserSetting = async (token: string) => {
    const res = await fetch("/api/user-settings", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const json = await res.json();
    if (json.setting) {
      setWeekdayLimit(
        typeof json.setting.weekdayDailyHours === "number"
          ? json.setting.weekdayDailyHours
          : ""
      );
      setWeekendLimitSetting(
        typeof json.setting.weekendHolidayHours === "number"
          ? json.setting.weekendHolidayHours
          : ""
      );
    }
  };

  const handleSaveSetting = async () => {
    if (!accessToken) return;
    setPosting(true);
    setError(null);
    const res = await fetch("/api/user-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        weekdayDailyHours: weekdayLimit === "" ? undefined : weekdayLimit,
        weekendHolidayHours: weekendLimitSetting === "" ? undefined : weekendLimitSetting,
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? `設定の保存に失敗しました (${res.status})`);
      setPosting(false);
      return;
    }
    setPosting(false);
  };

  const handleAdd = async () => {
    if (!accessToken) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("カテゴリ名を入力してください");
      return;
    }
    setPosting(true);
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: trimmed,
        dailyLimitHours: dailyLimit === "" ? undefined : dailyLimit,
        weekendHolidayHours: weekendLimitCategory === "" ? undefined : weekendLimitCategory,
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? `追加に失敗しました (${res.status})`);
      setPosting(false);
      return;
    }
    setName("");
    setDailyLimit("");
    setWeekendLimitCategory("");
    await fetchCategories(accessToken);
    setPosting(false);
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditDaily(c.dailyLimitHours ?? "");
    setEditWeekend(c.weekendHolidayHours ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDaily("");
    setEditWeekend("");
  };

  const handleSave = async () => {
    if (!accessToken || !editingId) return;
    if (!editName.trim()) {
      setError("カテゴリ名を入力してください");
      return;
    }
    setPosting(true);
    setError(null);
    const res = await fetch("/api/categories", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        id: editingId,
        name: editName.trim(),
        dailyLimitHours: editDaily === "" ? undefined : editDaily,
        weekendHolidayHours: editWeekend === "" ? undefined : editWeekend,
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? `更新に失敗しました (${res.status})`);
      setPosting(false);
      return;
    }
    cancelEdit();
    await fetchCategories(accessToken);
    setPosting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 via-sky-200 to-sky-300">
        <div className="rounded-xl bg-white/90 backdrop-blur-sm p-6 shadow-xl text-sm text-gray-600 border border-sky-200/50">
          読み込み中...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-100 via-sky-200 to-sky-300 flex items-center justify-center px-3 sm:px-4 py-4 sm:py-8">
      <div className="w-full max-w-xl rounded-xl bg-white/90 backdrop-blur-sm p-4 sm:p-6 shadow-xl space-y-4 border border-sky-200/50">
        <h1 className="text-xl sm:text-2xl font-semibold text-center text-gray-900">Setting</h1>

        <div className="space-y-2 rounded-lg bg-sky-50/80 border-2 border-sky-200/60 px-2 sm:px-3 py-2 shadow-sm">
          <h2 className="text-xs sm:text-sm font-medium text-gray-800">全体設定（1日あたり稼働時間）</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600">平日上限(h)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={weekdayLimit}
                onChange={(e) =>
                  setWeekdayLimit(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-full rounded border px-2 py-2 text-sm text-gray-900"
                placeholder="例: 8"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600">土日祝上限(h)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={weekendLimitSetting}
                onChange={(e) =>
                  setWeekendLimitSetting(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-full rounded border px-2 py-2 text-sm text-gray-900"
                placeholder="例: 4"
              />
            </div>
          </div>
          <button
            onClick={handleSaveSetting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60 text-sm font-medium shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
            disabled={posting}
          >
            全体設定を保存
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">新規カテゴリ</label>
          <div className="space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm text-gray-900"
              placeholder="カテゴリ名を入力"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600">1日上限(h)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={dailyLimit}
                  onChange={(e) =>
                    setDailyLimit(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full rounded border px-2 py-2 text-sm text-gray-900"
                  placeholder="例: 4"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">土日祝上限(h)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={weekendLimitCategory}
                  onChange={(e) =>
                    setWeekendLimitCategory(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full rounded border px-2 py-2 text-sm text-gray-900"
                  placeholder="例: 2"
                />
              </div>
            </div>
            <button
              onClick={handleAdd}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60 text-sm font-medium shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
              disabled={posting}
            >
              追加
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">カテゴリ一覧</p>
          {categories.length === 0 && (
            <p className="text-sm text-gray-500">カテゴリはありません</p>
          )}
          <ul className="space-y-2">
            {categories.map((c) => (
              <li
                key={c.id}
                className="rounded-lg bg-sky-50/80 border-2 border-sky-200/60 px-3 py-2 text-sm flex flex-col gap-2 text-gray-900 shadow-sm hover:shadow-md transition-shadow"
              >
                {editingId === c.id ? (
                  <div className="space-y-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded border px-3 py-2 text-sm text-gray-900"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600">1日上限(h)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={editDaily}
                          onChange={(e) =>
                            setEditDaily(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          className="w-full rounded border px-2 py-2 text-sm text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600">土日祝上限(h)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={editWeekend}
                          onChange={(e) =>
                            setEditWeekend(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          className="w-full rounded border px-2 py-2 text-sm text-gray-900"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        className="rounded bg-blue-600 px-3 py-1 text-white text-xs hover:bg-blue-700 disabled:opacity-60"
                        disabled={posting}
                      >
                        保存
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded border px-3 py-1 text-xs text-gray-700 hover:bg-gray-100"
                        disabled={posting}
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{c.name}</span>
                      <button
                        onClick={() => startEdit(c)}
                        className="rounded border px-3 py-1 text-xs text-gray-700 hover:bg-gray-100"
                      >
                        編集
                      </button>
                    </div>
                    <div className="text-[11px] text-gray-700 flex gap-3 flex-wrap">
                      {typeof c.dailyLimitHours === "number" && (
                        <span>平日: {c.dailyLimitHours}h/日</span>
                      )}
                      {typeof c.weekendHolidayHours === "number" && (
                        <span>土日祝: {c.weekendHolidayHours}h/日</span>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

