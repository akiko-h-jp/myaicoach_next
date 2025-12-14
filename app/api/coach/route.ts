import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/supabase-server";
import { generateCoachingMessage } from "@/lib/coach";
import { sendLineNotification } from "@/lib/line";
import { LineMessageType } from "@prisma/client";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const body = await req.json().catch(() => ({}));
  const targetDateStr = body?.targetDate as string | undefined;
  const targetDate = targetDateStr
    ? parseDateJst(targetDateStr)
    : parseDateJst(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" }));
  const sendLine = body?.sendLine === true;

  // 当日のスケジュールを取得
  const schedules = await prisma.scheduleEntry.findMany({
    where: {
      userId: user.id,
      date: { gte: startOfDay(targetDate), lt: endOfDay(targetDate) },
    },
    include: {
      task: true,
      category: true,
    },
    orderBy: { date: "asc" },
  });

  const entries = schedules.map((s) => ({
    task_name: s.task.title,
    category: s.category?.name ?? null,
    estimated_hours: s.scheduledHours ?? s.task.estimatedHours ?? undefined,
    priority: s.task.priority,
  }));

  const { message, warnings } = await generateCoachingMessage(entries, targetDate, apiKey);

  // 保存（LineMessage）
  const lineMsg = await prisma.lineMessage.create({
    data: {
      userId: user.id,
      date: startOfDay(targetDate),
      message,
      type: LineMessageType.COACH,
      sentAt: null,
    },
  });

  let lineResult: { ok: boolean; error?: string } | null = null;
  if (sendLine) {
    console.log("📤 Sending LINE notification...");
    lineResult = await sendLineNotification(message);
    if (lineResult.ok) {
      await prisma.lineMessage.update({
        where: { id: lineMsg.id },
        data: { sentAt: new Date() },
      });
      console.log("✅ LINE notification sent and saved");
    } else {
      console.error("❌ LINE notification failed:", lineResult.error);
    }
  } else {
    console.log("⏭️  LINE notification skipped (sendLine=false)");
  }

  return NextResponse.json({
    message,
    warnings,
    line: lineResult,
  });
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// "YYYY-MM-DD" を JST の日付として解釈
function parseDateJst(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map((v) => Number(v));
  // JSTの日付として解釈（ローカル時間でDateを作成）
  return new Date(y, m - 1, d);
}

