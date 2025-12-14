"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowserClient } from "@/lib/supabase-client";

type Task = {
  id: string;
  title: string;
  status: "TODO" | "DONE";
  priority: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  description?: string | null;
  categoryId?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
  progress?: number | null;
  createdAt: string;
};

type Category = {
  id: string;
  name: string;
};

const priorityLabel = (p: "HIGH" | "MEDIUM" | "LOW" | "NONE") => {
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
};

export default function TasksPage() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState<number | "">("");
  const [progress, setProgress] = useState<number | "">(0);
  const [priority, setPriority] = useState<"HIGH" | "MEDIUM" | "LOW" | "NONE">("NONE");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editEstimated, setEditEstimated] = useState<number | "">("");
  const [editProgress, setEditProgress] = useState<number | "">("");
  const [editPriority, setEditPriority] = useState<"HIGH" | "MEDIUM" | "LOW" | "NONE">("NONE");
  const [editDescription, setEditDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);

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
      // JWTトークンの形式（3つの部分がドットで区切られている）のみを抽出
      // 例: eyJ... . eyJ... . abc...
      const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;
      const match = token.match(jwtPattern);
      if (!match) {
        setError("トークンの形式が不正です。再度ログインしてください。");
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }
      const cleanToken = match[0];
      if (cleanToken !== token) {
        console.warn("Token had extra content, cleaned:", cleanToken.substring(0, 20) + "...");
      }
      setAccessToken(cleanToken);
      await fetchCategories(cleanToken);
      await fetchTasks(cleanToken);
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCategories = async (token: string) => {
    const res = await fetch("/api/categories", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const json = await res.json();
    setCategories(json.categories ?? []);
  };

  const fetchTasks = async (token: string) => {
    setError(null);
    const res = await fetch("/api/tasks", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      setError(`取得に失敗しました (${res.status})`);
      return;
    }
    const json = await res.json();
    setTasks(json.tasks ?? []);
  };

  const handleAdd = async () => {
    if (!accessToken) return;
    const t = title.trim();
    if (!t) {
      setError("タイトルを入力してください");
      return;
    }
    setPosting(true);
    setError(null);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        title: t,
        categoryId: categoryId || undefined,
        dueDate: dueDate || undefined,
        estimatedHours: estimatedHours === "" ? undefined : estimatedHours,
        progress: progress === "" ? undefined : progress,
        priority,
        description: description || undefined,
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? `追加に失敗しました (${res.status})`);
      setPosting(false);
      return;
    }
    setTitle("");
    setCategoryId(null);
    setDueDate("");
    setEstimatedHours("");
    setProgress(0);
    setPriority("NONE");
    setDescription("");
    await fetchTasks(accessToken);
    setPosting(false);
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditCategoryId(task.categoryId ?? null);
    setEditDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
    setEditEstimated(
      typeof task.estimatedHours === "number" ? task.estimatedHours : ""
    );
    setEditProgress(typeof task.progress === "number" ? task.progress : "");
    setEditPriority(task.priority ?? "NONE");
    setEditDescription(task.description ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditCategoryId(null);
    setEditDueDate("");
    setEditEstimated("");
    setEditProgress("");
    setEditPriority("NONE");
    setEditDescription("");
  };

  const handleEditSave = async () => {
    if (!accessToken || !editingId) return;
    if (!editTitle.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    setMutatingId(editingId);
    setError(null);
    const res = await fetch("/api/tasks", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        id: editingId,
        title: editTitle.trim(),
        categoryId: editCategoryId || undefined,
        dueDate: editDueDate || undefined,
        estimatedHours: editEstimated === "" ? undefined : editEstimated,
        progress: editProgress === "" ? undefined : editProgress,
        priority: editPriority,
        description: editDescription || undefined,
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? `更新に失敗しました (${res.status})`);
      setMutatingId(null);
      return;
    }
    await fetchTasks(accessToken);
    setMutatingId(null);
    cancelEdit();
  };

  const handleToggle = async (task: Task) => {
    if (!accessToken) return;
    setMutatingId(task.id);
    setError(null);
    const res = await fetch("/api/tasks", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        id: task.id,
        status: task.status === "DONE" ? "TODO" : "DONE",
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? `更新に失敗しました (${res.status})`);
      setMutatingId(null);
      return;
    }
    await fetchTasks(accessToken);
    setMutatingId(null);
  };

  const handleDelete = async (task: Task) => {
    if (!accessToken) return;
    setMutatingId(task.id);
    setError(null);
    const res = await fetch("/api/tasks", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ id: task.id }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? `削除に失敗しました (${res.status})`);
      setMutatingId(null);
      return;
    }
    await fetchTasks(accessToken);
    setMutatingId(null);
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
      <div className="w-full max-w-md rounded-xl bg-white/90 backdrop-blur-sm p-4 sm:p-6 shadow-xl space-y-4 border border-sky-200/50">
        <h1 className="text-xl sm:text-2xl font-semibold text-center text-gray-900">Tasks</h1>

        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-700">新規タスク</label>
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 rounded border px-3 py-2 text-sm text-gray-900"
                placeholder="タイトルを入力"
              />
              <button
                onClick={handleAdd}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60 text-sm font-medium whitespace-nowrap"
                disabled={posting}
              >
                追加
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600">カテゴリ</label>
                <select
                  className="w-full rounded border px-2 py-2 text-sm text-gray-900"
                  value={categoryId ?? ""}
                  onChange={(e) =>
                    setCategoryId(e.target.value ? e.target.value : null)
                  }
                >
                  <option value="">未選択</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600">締切</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded border px-2 py-2 text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">見積(h)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={estimatedHours}
                  onChange={(e) =>
                    setEstimatedHours(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full rounded border px-2 py-2 text-sm text-gray-900"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">進捗(%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) =>
                    setProgress(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full rounded border px-2 py-2 text-sm text-gray-900"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">優先度</label>
                <select
                  className="w-full rounded border px-2 py-2 text-sm text-gray-900"
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as "HIGH" | "MEDIUM" | "LOW" | "NONE")
                  }
                >
                  <option value="NONE">なし</option>
                  <option value="HIGH">高</option>
                  <option value="MEDIUM">中</option>
                  <option value="LOW">低</option>
                </select>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs text-gray-600">説明</label>
                <textarea
                  className="w-full rounded border px-2 py-2 text-sm text-gray-900"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="任意でメモを記入"
                />
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">タスク一覧</p>
          {tasks.length === 0 && (
            <p className="text-sm text-gray-500">タスクはありません</p>
          )}
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="rounded-lg bg-sky-50/80 border-2 border-sky-200/60 px-2 sm:px-3 py-2 text-xs sm:text-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  {editingId === task.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="col-span-1 sm:col-span-2">
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded border px-3 py-2 text-sm text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600">カテゴリ</label>
                          <select
                            className="w-full rounded border px-2 py-2 text-sm text-gray-900"
                            value={editCategoryId ?? ""}
                            onChange={(e) =>
                              setEditCategoryId(e.target.value ? e.target.value : null)
                            }
                          >
                            <option value="">未選択</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600">締切</label>
                          <input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className="w-full rounded border px-2 py-2 text-sm text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600">見積(h)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={editEstimated}
                            onChange={(e) =>
                              setEditEstimated(
                                e.target.value === "" ? "" : Number(e.target.value)
                              )
                            }
                            className="w-full rounded border px-2 py-2 text-sm text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600">進捗(%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editProgress}
                            onChange={(e) =>
                              setEditProgress(
                                e.target.value === "" ? "" : Number(e.target.value)
                              )
                            }
                            className="w-full rounded border px-2 py-2 text-sm text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600">優先度</label>
                          <select
                            className="w-full rounded border px-2 py-2 text-sm text-gray-900"
                            value={editPriority}
                            onChange={(e) =>
                              setEditPriority(e.target.value as "HIGH" | "MEDIUM" | "LOW" | "NONE")
                            }
                          >
                            <option value="NONE">なし</option>
                            <option value="HIGH">高</option>
                            <option value="MEDIUM">中</option>
                            <option value="LOW">低</option>
                          </select>
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <label className="block text-xs text-gray-600">説明</label>
                          <textarea
                            className="w-full rounded border px-2 py-2 text-sm text-gray-900"
                            rows={2}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleEditSave}
                          className="rounded bg-blue-600 px-3 py-1 text-white text-xs hover:bg-blue-700 disabled:opacity-60"
                          disabled={mutatingId === task.id}
                        >
                          保存
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded border px-3 py-1 text-xs text-gray-700 hover:bg-gray-100"
                          disabled={mutatingId === task.id}
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleToggle(task)}
                          className="rounded border px-2 py-1 text-xs text-gray-900 hover:bg-gray-100 disabled:opacity-60 whitespace-nowrap"
                          disabled={mutatingId === task.id}
                        >
                          {task.status === "DONE" ? "未完了に戻す" : "完了にする"}
                        </button>
                        <span
                          className={`text-gray-900 break-words ${
                            task.status === "DONE" ? "line-through text-gray-500" : ""
                          }`}
                        >
                          {task.title}
                        </span>
                        {task.status === "DONE" && (
                          <span className="text-[10px] text-green-600 font-semibold whitespace-nowrap">done</span>
                        )}
                        <button
                          onClick={() => startEdit(task)}
                          className="rounded border px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 whitespace-nowrap"
                          disabled={mutatingId === task.id}
                        >
                          編集
                        </button>
                      </div>
                      <div className="text-[11px] text-gray-700 flex gap-3 flex-wrap">
                        {task.priority && task.priority !== "NONE" && (
                          <span className="text-gray-900">
                            優先度: {priorityLabel(task.priority)}
                          </span>
                        )}
                        {task.categoryId && (
                          <span className="text-gray-900">
                            カテゴリ:{" "}
                            {categories.find((c) => c.id === task.categoryId)?.name ??
                              task.categoryId}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="text-gray-900">
                            締切: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        {typeof task.estimatedHours === "number" && (
                          <span className="text-gray-900">見積: {task.estimatedHours}h</span>
                        )}
                        {typeof task.progress === "number" && (
                          <span className="text-gray-900">進捗: {task.progress}%</span>
                        )}
                        {task.description && (
                          <span className="text-gray-900">説明: {task.description}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(task)}
                  className="rounded bg-red-500 px-2 py-1 text-white text-xs hover:bg-red-600 disabled:opacity-60 whitespace-nowrap self-start sm:self-auto"
                  disabled={mutatingId === task.id}
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

