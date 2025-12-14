"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowserClient } from "@/lib/supabase-client";

type ScheduleEntry = {
  id: string;
  date: string;
  scheduledHours: number | null;
  task: {
    id: string;
    title: string;
    priority: "HIGH" | "MEDIUM" | "LOW" | "NONE";
    status: "TODO" | "DONE";
  };
  category?: {
    id: string;
    name: string;
  } | null;
};

export default function SchedulePage() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" }); // YYYY-MM-DD (JST)

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
      // トークンをクリーンアップ（改行や余分な文字を削除）
      const cleanToken = token.trim().split(/\s+/)[0];
      setAccessToken(cleanToken);
      await fetchSchedules(cleanToken);
      setLoading(false);
    };
    init();
  }, [router, supabase]);

  const fetchSchedules = async (token: string) => {
    const res = await fetch("/api/schedule", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setError(`スケジュール取得に失敗しました (${res.status})`);
      return;
    }
    const json = await res.json();
    setEntries(json.schedules ?? []);
  };

  const handleRun = async () => {
    if (!accessToken) return;
    setRunning(true);
    setError(null);
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? `スケジューリングに失敗しました (${res.status})`);
      setRunning(false);
      return;
    }
    await fetchSchedules(accessToken);
    setRunning(false);
  };

  const handleSendLineToday = async () => {
    if (!accessToken) return;
    setSending(true);
    setError(null);
    setSent(false);
    setWarnings([]);
    setMessage("");
    const today = todayKey;
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ targetDate: today, sendLine: true }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? `LINE送信に失敗しました (${res.status})`);
      setSending(false);
      return;
    }
    const json = await res.json();
    setMessage(json.message ?? "");
    setWarnings(json.warnings ?? []);
    setSent(json.line?.ok === true);
    setSending(false);
  };

  // show only today and future schedules
  const grouped = entries
    .filter((e) => e.date.slice(0, 10) >= todayKey)
    .reduce<Record<string, ScheduleEntry[]>>((acc, e) => {
      const key = e.date.slice(0, 10);
      if (!acc[key]) acc[key] = [];
      acc[key].push(e);
      return acc;
    }, {});
  const todayEntries = grouped[todayKey] ?? [];

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
      <div className="w-full max-w-2xl rounded-xl bg-white/90 backdrop-blur-sm p-4 sm:p-6 shadow-xl space-y-4 border border-sky-200/50">
        <h1 className="text-xl sm:text-2xl font-semibold text-center text-gray-900">Schedule</h1>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={handleRun}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60 shadow-md hover:shadow-lg transition-all font-medium text-sm sm:text-base whitespace-nowrap"
            disabled={running}
          >
            スケジューリングを実行
          </button>
          {running && <span className="text-xs sm:text-sm text-gray-700 font-medium">実行中...</span>}
        </div>

        <div className="space-y-2 rounded-lg bg-sky-50/80 border-2 border-sky-200/60 px-2 sm:px-3 py-2 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-gray-800">本日のタスクをLINE送信</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSendLineToday}
                className="rounded-lg bg-green-600 px-3 py-1 text-white text-xs hover:bg-green-700 disabled:opacity-60 shadow-md hover:shadow-lg transition-all font-medium whitespace-nowrap"
                disabled={sending}
              >
                送信
              </button>
              {sending && <span className="text-xs text-gray-600">送信中...</span>}
              {sent && <span className="text-xs text-green-700">送信しました</span>}
            </div>
          </div>
          {warnings.length > 0 && (
            <div className="rounded bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
              {warnings.map((w, i) => (
                <div key={i}>⚠️ {w}</div>
              ))}
            </div>
          )}
          {message && (
            <div className="text-xs text-gray-900">
              <div className="font-semibold text-gray-800 mb-1">生成メッセージ</div>
              <div className="whitespace-pre-wrap">{message}</div>
            </div>
          )}
          <div className="text-xs text-gray-700">
            本日: {todayKey}（スケジュール生成後の内容を送信します）
          </div>
          <div className="space-y-2 text-xs">
            {todayEntries.length === 0 && <div className="text-gray-600">本日のスケジュールはありません</div>}
            {todayEntries.map((e) => (
              <div key={e.id} className="rounded-md bg-white/70 border border-sky-200/50 px-2 py-1.5 shadow-sm flex flex-col sm:flex-row gap-1 sm:gap-2 flex-wrap">
                <span className="font-medium text-gray-900 break-words">{e.task.title}</span>
                <span className="text-gray-600 text-xs sm:text-xs">時間: {e.scheduledHours ?? 0}h</span>
                {e.category?.name && <span className="text-gray-600 text-xs sm:text-xs">カテゴリ: {e.category.name}</span>}
                {e.task.priority !== "NONE" && (
                  <span className="text-gray-600 text-xs sm:text-xs">優先度: {priorityLabel(e.task.priority)}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-3">
          {Object.keys(grouped).length === 0 && (
            <p className="text-sm text-gray-500">スケジュールはありません</p>
          )}
          {Object.keys(grouped)
            .sort()
            .map((date) => (
              <div key={date} className="rounded-lg bg-sky-50/80 border-2 border-sky-200/60 px-3 py-2 space-y-2 shadow-sm">
                <div className="text-sm font-semibold text-gray-900">{date}</div>
                <ul className="space-y-2">
                  {grouped[date].map((e) => (
                    <li key={e.id} className="rounded-md bg-white/70 border border-sky-200/50 px-2 py-1.5 shadow-sm text-xs sm:text-sm text-gray-900 flex flex-col sm:flex-row gap-1 sm:gap-2 flex-wrap">
                      <span className="font-medium break-words">{e.task.title}</span>
                      <span className="text-[11px] text-gray-600">
                        時間: {e.scheduledHours ?? 0}h
                      </span>
                      {e.category?.name && (
                        <span className="text-[11px] text-gray-600">
                          カテゴリ: {e.category.name}
                        </span>
                      )}
                      {e.task.priority !== "NONE" && (
                        <span className="text-[11px] text-gray-600">
                          優先度: {priorityLabel(e.task.priority)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </div>
    </main>
  );
}

function priorityLabel(p: "HIGH" | "MEDIUM" | "LOW" | "NONE") {
  switch (p) {
    case "HIGH":
      return "高";
    case "MEDIUM":
      return "中";
    case "LOW":
      return "低";
    default:
      return "なし";
  }
}

