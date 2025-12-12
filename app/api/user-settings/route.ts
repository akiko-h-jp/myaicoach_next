import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/supabase-server";

// GET: ユーザーの稼働時間設定を取得
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const setting = await prisma.userSetting.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({
    setting,
  });
}

// POST/PATCH: 稼働時間設定を保存 { weekdayDailyHours?, weekendHolidayHours? }
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const weekday =
    typeof body?.weekdayDailyHours === "number" ? body.weekdayDailyHours : null;
  const weekend =
    typeof body?.weekendHolidayHours === "number" ? body.weekendHolidayHours : null;

  const setting = await prisma.userSetting.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      weekdayDailyHours: weekday,
      weekendHolidayHours: weekend,
    },
    update: {
      weekdayDailyHours: weekday,
      weekendHolidayHours: weekend,
    },
  });

  return NextResponse.json({ setting });
}

