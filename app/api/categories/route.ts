import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      console.error("POST /api/categories: Unauthorized - user is null");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch((e) => {
      console.error("POST /api/categories: Failed to parse JSON body:", e);
      return null;
    });
    
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const dailyLimitHours =
      typeof body?.dailyLimitHours === "number" ? body.dailyLimitHours : null;
    const weekendHolidayHours =
      typeof body?.weekendHolidayHours === "number" ? body.weekendHolidayHours : null;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    console.log("POST /api/categories: Creating category for user:", user.id, "name:", name);

    const category = await prisma.category.create({
      data: {
        userId: user.id,
        name,
        dailyLimitHours,
        weekendHolidayHours,
      },
    });

    console.log("POST /api/categories: Category created successfully:", category.id);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/categories error:", error);
    console.error("Error stack:", error?.stack);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error?.message || String(error),
        code: error?.code || "UNKNOWN"
      },
      { status: 500 }
    );
  }
}

// PATCH /api/categories - update category { id, name?, dailyLimitHours?, weekendHolidayHours? }
export async function PATCH(req: NextRequest) {
  try {
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
  } catch (error: any) {
    console.error("PATCH /api/categories error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

