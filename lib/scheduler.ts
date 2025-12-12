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
 * ルールベーススケジューラ（デフォルト）
 * - 締切と優先度でスコアリング
 * - 1日上限時間を超えないように割付
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
  const catMap = new Map(categories.map((c) => [c.name, c]));

  const scored: ScoreTask[] = tasks.map((t) => {
    const cs = t.categoryName ? catMap.get(t.categoryName) : undefined;
    return { task: t, score: calcTaskScore(t, cs) };
  });
  scored.sort((a, b) => b.score - a.score);

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

  for (const { task } of scored) {
    let remaining = Math.max(0, task.estimatedHours);
    const deadline = task.dueDate ? new Date(task.dueDate) : new Date(start.getTime() + 7 * 86400000);
    if (deadline < start) deadline.setTime(start.getTime());

    let cursor = new Date(start);
    let guard = 0;
    while (remaining > 0 && cursor <= deadline && guard < 365) {
      const bucket = getDayBucket(cursor, task.categoryName);
      const assign = Math.min(remaining, bucket.remaining);
      if (assign > 0) {
        bucket.entries.push({
          date: new Date(cursor),
          taskId: task.id,
          scheduledHours: Math.round(assign * 100) / 100,
          categoryName: task.categoryName,
        });
        bucket.remaining -= assign;
        remaining -= assign;
      }
      cursor.setDate(cursor.getDate() + 1);
      guard++;
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

