import { TaskStatus, TaskPriority } from "@prisma/client";
import { isWeekendOrHoliday } from "./holidays";

export type ScheduleInputTask = {
  id: string;
  title: string;
  categoryName?: string | null;
  dueDate?: Date | null;
  estimatedHours: number;
  priority?: TaskPriority | null;
  progress?: number | null;
};

export type CategorySetting = {
  name: string;
  dailyLimitHours?: number | null;
  weekendHolidayHours?: number | null;
  priority?: TaskPriority | null;
};

export type ScheduleResult = {
  date: Date;
  taskId: string;
  scheduledHours: number;
  categoryName?: string | null;
};

type ScoreTask = {
  task: ScheduleInputTask;
  score: number;
};

function getDailyLimit(date: Date, base?: number | null, weekendHoliday?: number | null) {
  if (isWeekendOrHoliday(date) && weekendHoliday != null) {
    return weekendHoliday;
  }
  return base ?? 0;
}

// 日付のみに正規化（時刻を00:00:00に設定）
function normalizeDate(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// 日付のみで比較（時刻を無視）
function compareDatesOnly(date1: Date, date2: Date): number {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  return d1.getTime() - d2.getTime();
}

function calcTaskScore(task: ScheduleInputTask, categorySetting?: CategorySetting) {
  let score = 0;

  // priority
  if (task.priority === TaskPriority.HIGH) score += 100;
  else if (task.priority === TaskPriority.MEDIUM) score += 50;
  else if (task.priority === TaskPriority.LOW) score += 10;

  // due date proximity
  if (task.dueDate) {
    const today = new Date();
    const days = Math.floor((task.dueDate.getTime() - today.getTime()) / 86400000);
    if (days < 0) score += 1000;
    else if (days <= 1) score += 500;
    else if (days <= 3) score += 200;
    else if (days <= 7) score += 100;
    else score += Math.max(0, 100 - days);
  }

  // category priority
  if (categorySetting?.priority === TaskPriority.HIGH) score += 50;
  else if (categorySetting?.priority === TaskPriority.MEDIUM) score += 25;

  return score;
}

/**
 * ルールベーススケジューラ（改善版）
 * - 締切と優先度でスコアリング
 * - 1日上限時間を超えないように割付
 * - 複数タスクを均等に配置
 * - estimatedHours は残作業時間として扱う想定
 */
export function scheduleTasksRuleBased(
  tasks: ScheduleInputTask[],
  categories: CategorySetting[],
  weekdayDefaultDailyLimit: number,
  weekendHolidayDefaultLimit?: number | null,
  startDate?: Date
): ScheduleResult[] {
  const start = startDate ? new Date(startDate) : new Date();
  const normalizedStart = normalizeDate(start);
  const catMap = new Map(categories.map((c) => [c.name, c]));

  // タスクをスコア順にソート
  const scored: ScoreTask[] = tasks.map((t) => {
    const cs = t.categoryName ? catMap.get(t.categoryName) : undefined;
    return { task: t, score: calcTaskScore(t, cs) };
  });
  scored.sort((a, b) => b.score - a.score);

  // 各タスクの締切日を計算
  const taskDeadlines = new Map<string, Date>();
  for (const { task } of scored) {
    let deadline: Date;
    if (task.dueDate) {
      deadline = normalizeDate(task.dueDate);
      // 締切日が開始日より前の場合は開始日に設定
      if (compareDatesOnly(deadline, normalizedStart) < 0) {
        deadline = new Date(normalizedStart);
      }
    } else {
      // 締切日がない場合は開始日から7日後
      deadline = new Date(normalizedStart);
      deadline.setDate(deadline.getDate() + 7);
    }
    taskDeadlines.set(task.id, deadline);
  }

  // 最大締切日を計算（スケジュール範囲の終了日）
  const maxDeadline = Array.from(taskDeadlines.values()).reduce((max, d) => {
    return compareDatesOnly(d, max) > 0 ? d : max;
  }, normalizedStart);

  // 日ごとのバケットを初期化
  const daily: Record<string, { remaining: number; entries: ScheduleResult[] }> = {};
  const getDayBucket = (d: Date, catName?: string | null) => {
    const key = d.toISOString().slice(0, 10);
    if (!daily[key]) {
      const cs = catName ? catMap.get(catName) : undefined;
      const limit = getDailyLimit(
        d,
        cs?.dailyLimitHours ?? weekdayDefaultDailyLimit,
        cs?.weekendHolidayHours ?? weekendHolidayDefaultLimit ?? weekdayDefaultDailyLimit
      );
      daily[key] = { remaining: limit, entries: [] };
    }
    return daily[key];
  };

  // 各タスクの残り時間を管理
  const taskRemaining = new Map<string, number>();
  for (const { task } of scored) {
    taskRemaining.set(task.id, Math.max(0, task.estimatedHours));
  }

  // 均等配置アルゴリズム: 日ごとに、利用可能なタスクから均等に割り当て
  let cursor = new Date(normalizedStart);
  const maxDays = 365;
  let guard = 0;

  while (guard < maxDays && compareDatesOnly(cursor, maxDeadline) <= 0) {
    // この日にスケジュール可能なタスクを取得（締切日がこの日以降で、残り時間があるタスク）
    const availableTasks = scored
      .filter(({ task }) => {
        const remaining = taskRemaining.get(task.id) ?? 0;
        const deadline = taskDeadlines.get(task.id)!;
        return (
          remaining > 0 &&
          compareDatesOnly(cursor, deadline) <= 0
        );
      })
      .map(({ task }) => task);

    if (availableTasks.length === 0) {
      // スケジュール可能なタスクがない場合は次の日へ
      cursor.setDate(cursor.getDate() + 1);
      guard++;
      continue;
    }

    // この日に各タスクを均等に割り当て
    for (const task of availableTasks) {
      const remaining = taskRemaining.get(task.id) ?? 0;
      if (remaining <= 0) continue;

      const bucket = getDayBucket(cursor, task.categoryName);
      if (bucket.remaining <= 0) continue;

      // 1日の上限時間を考慮して、均等に割り当て
      // 複数タスクがある場合、1日の上限時間をタスク数で割った分を目安にする
      const avgPerTask = bucket.remaining / availableTasks.length;
      const assign = Math.min(remaining, avgPerTask, bucket.remaining);

      if (assign > 0.01) {
        // 0.01時間（36秒）以上の割り当てのみ追加
        const roundedAssign = Math.round(assign * 100) / 100;
        bucket.entries.push({
          date: new Date(cursor),
          taskId: task.id,
          scheduledHours: roundedAssign,
          categoryName: task.categoryName,
        });
        bucket.remaining -= roundedAssign;
        taskRemaining.set(task.id, remaining - roundedAssign);
      }
    }

    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }

  // まだ残り時間があるタスクがある場合、締切日までに確実に割り当てる
  for (const { task } of scored) {
    let remaining = taskRemaining.get(task.id) ?? 0;
    if (remaining <= 0) continue;

    const deadline = taskDeadlines.get(task.id)!;
    let cursor = new Date(normalizedStart);
    guard = 0;

    while (remaining > 0 && guard < maxDays && compareDatesOnly(cursor, deadline) <= 0) {
      const bucket = getDayBucket(cursor, task.categoryName);
      const assign = Math.min(remaining, bucket.remaining);
      if (assign > 0.01) {
        const roundedAssign = Math.round(assign * 100) / 100;
        bucket.entries.push({
          date: new Date(cursor),
          taskId: task.id,
          scheduledHours: roundedAssign,
          categoryName: task.categoryName,
        });
        bucket.remaining -= roundedAssign;
        remaining -= roundedAssign;
        taskRemaining.set(task.id, remaining);
      }
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }

    // 締切日を超えても残り時間がある場合は警告
    const finalRemaining = taskRemaining.get(task.id) ?? 0;
    if (finalRemaining > 0) {
      console.warn(
        `Task "${task.title}" (ID: ${task.id}) could not be fully scheduled. ` +
        `Remaining: ${finalRemaining}h, Deadline: ${deadline.toISOString().slice(0, 10)}`
      );
    }
  }

  // flatten
  const results: ScheduleResult[] = [];
  Object.keys(daily)
    .sort()
    .forEach((key) => {
      results.push(...daily[key].entries);
    });
  return results;
}

