import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/supabase-server";
import {
  scheduleTasksRuleBased,
  type ScheduleInputTask,
  type CategorySetting,
} from "@/lib/scheduler";
import { TaskPriority, TaskStatus } from "@prisma/client";

// スケジュール作成: 今日以降のScheduleEntryを削除して再生成する
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // デフォルト日次上限（カテゴリ未設定時）
  const userSetting = await prisma.userSetting.findUnique({
    where: { userId: user.id },
  });
  const weekdayDefault = userSetting?.weekdayDailyHours ?? 8;
  const weekendDefault = userSetting?.weekendHolidayHours ?? userSetting?.weekdayDailyHours ?? 8;

  // タスク取得（未完了、残り時間あり）
  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      status: { not: TaskStatus.DONE },
    },
    include: { category: true },
  });

  const inputTasks: ScheduleInputTask[] = tasks
    .map((t): ScheduleInputTask | null => {
      const remaining =
        t.estimatedHours != null
          ? Math.max(0, t.estimatedHours * (1 - (t.progress ?? 0) / 100))
          : 0;
      if (remaining <= 0) return null;
      const task: ScheduleInputTask = {
        id: t.id,
        title: t.title,
        categoryName: t.category?.name ?? null,
        dueDate: t.dueDate ?? null,
        estimatedHours: remaining,
        priority: t.priority ?? TaskPriority.NONE,
        progress: t.progress ?? 0,
      };
      // デバッグログ: タスク情報を出力
      console.log(`📋 Task: "${task.title}"`, {
        id: task.id,
        estimatedHours: task.estimatedHours,
        originalEstimatedHours: t.estimatedHours,
        progress: task.progress,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : null,
        priority: task.priority,
        category: task.categoryName,
      });
      return task;
    })
    .filter((x): x is ScheduleInputTask => x !== null);

  if (inputTasks.length === 0) {
    // 既存のスケジュールだけ消して終わり
    await prisma.scheduleEntry.deleteMany({
      where: {
        userId: user.id,
        date: { gte: startOfDay(new Date()) },
      },
    });
    return NextResponse.json({ schedules: [] });
  }

  // カテゴリ設定取得
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
  });
  const catSettings: CategorySetting[] = categories.map((c) => ({
    name: c.name,
    dailyLimitHours: c.dailyLimitHours,
    weekendHolidayHours: c.weekendHolidayHours,
    // priorityはCategoryには今スキーマ上ないので未設定（オプショナルなので省略可能）
  }));

  const start = startOfDay(new Date());
  console.log(`🚀 Starting schedule generation:`, {
    taskCount: inputTasks.length,
    weekdayDefault,
    weekendDefault,
    startDate: start.toISOString().slice(0, 10),
  });
  const schedule = scheduleTasksRuleBased(
    inputTasks,
    catSettings,
    weekdayDefault,
    weekendDefault,
    start
  );
  console.log(`✅ Schedule generated:`, {
    totalEntries: schedule.length,
    totalHours: schedule.reduce((sum, s) => sum + s.scheduledHours, 0),
    byDate: schedule.reduce((acc, s) => {
      const key = s.date.toISOString().slice(0, 10);
      acc[key] = (acc[key] || 0) + s.scheduledHours;
      return acc;
    }, {} as Record<string, number>),
  });

  // 今日以降のスケジュールを削除し、新しく挿入
  await prisma.scheduleEntry.deleteMany({
    where: { userId: user.id, date: { gte: start } },
  });

  if (schedule.length > 0) {
    await prisma.scheduleEntry.createMany({
      data: schedule.map((s) => ({
        userId: user.id,
        taskId: s.taskId,
        categoryId: categories.find((c) => c.name === s.categoryName)?.id ?? null,
        date: s.date,
        scheduledHours: s.scheduledHours,
      })),
    });
  }

  return NextResponse.json({ schedules: schedule });
}

// スケジュール取得（オプション: start/end）
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const start = startParam ? new Date(startParam) : startOfDay(new Date());
  const end = endParam ? new Date(endParam) : undefined;

  const schedules = await prisma.scheduleEntry.findMany({
    where: {
      userId: user.id,
      date: {
        gte: start,
        ...(end ? { lte: end } : {}),
      },
    },
    orderBy: { date: "asc" },
    include: {
      task: true,
      category: true,
    },
  });

  return NextResponse.json({ schedules });
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

