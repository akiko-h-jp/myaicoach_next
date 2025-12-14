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
    // 数値の変換: number型、または文字列として送られてきた数値を変換
    let dailyLimitHours: number | null = null;
    if (body?.dailyLimitHours !== undefined && body?.dailyLimitHours !== null && body?.dailyLimitHours !== "") {
      const parsed = typeof body.dailyLimitHours === "number" 
        ? body.dailyLimitHours 
        : typeof body.dailyLimitHours === "string" 
          ? parseFloat(body.dailyLimitHours) 
          : null;
      if (parsed !== null && !isNaN(parsed)) {
        dailyLimitHours = parsed;
      }
    }
    
    let weekendHolidayHours: number | null = null;
    if (body?.weekendHolidayHours !== undefined && body?.weekendHolidayHours !== null && body?.weekendHolidayHours !== "") {
      const parsed = typeof body.weekendHolidayHours === "number" 
        ? body.weekendHolidayHours 
        : typeof body.weekendHolidayHours === "string" 
          ? parseFloat(body.weekendHolidayHours) 
          : null;
      if (parsed !== null && !isNaN(parsed)) {
        weekendHolidayHours = parsed;
      }
    }

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    console.log("POST /api/categories: Creating category for user:", user.id, "name:", name, "dailyLimitHours:", dailyLimitHours, "weekendHolidayHours:", weekendHolidayHours);

    let category;
    try {
      console.log("POST /api/categories: Attempting to create category...");
      category = await prisma.category.create({
        data: {
          userId: user.id,
          name,
          dailyLimitHours,
          weekendHolidayHours,
        },
      });
      console.log("POST /api/categories: Category created successfully:", category.id);
    } catch (dbError: any) {
      console.error("POST /api/categories: Database error:", {
        message: dbError.message,
        code: dbError.code,
        meta: dbError.meta,
        stack: dbError.stack,
        errorName: dbError.name,
      });
      
      // P1001エラー（接続エラー）の場合、より詳細な情報を提供
      if (dbError.code === "P1001") {
        console.error("❌ Database connection error (P1001):");
        console.error("   - This usually means the database server is unreachable");
        console.error("   - Check if DATABASE_URL is correct in Vercel environment variables");
        console.error("   - Verify Supabase project is active and accessible");
        console.error("   - Check network connectivity from Vercel to Supabase");
      }
      
      // データベースエラーを再スローして、外側のcatchブロックで処理
      throw dbError;
    }

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

