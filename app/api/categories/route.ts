import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const dailyLimitHours =
    typeof body?.dailyLimitHours === "number" ? body.dailyLimitHours : null;
  const weekendHolidayHours =
    typeof body?.weekendHolidayHours === "number" ? body.weekendHolidayHours : null;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: {
      userId: user.id,
      name,
      dailyLimitHours,
      weekendHolidayHours,
    },
  });

  return NextResponse.json({ category }, { status: 201 });
}

// PATCH /api/categories - update category { id, name?, dailyLimitHours?, weekendHolidayHours? }
export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const dailyLimitHours =
    typeof body?.dailyLimitHours === "number" ? body.dailyLimitHours : undefined;
  const weekendHolidayHours =
    typeof body?.weekendHolidayHours === "number" ? body.weekendHolidayHours : undefined;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (dailyLimitHours !== undefined) data.dailyLimitHours = dailyLimitHours;
  if (weekendHolidayHours !== undefined) data.weekendHolidayHours = weekendHolidayHours;

  const updated = await prisma.category.updateMany({
    where: { id, userId: user.id },
    data,
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const category = await prisma.category.findUnique({ where: { id } });
  return NextResponse.json({ category });
}

