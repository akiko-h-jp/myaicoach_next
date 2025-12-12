import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/supabase-server";
import { TaskStatus, TaskPriority } from "@prisma/client";

// GET /api/tasks - list tasks for current user
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tasks });
}

// POST /api/tasks - create new task { title: string }
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const categoryId = typeof body?.categoryId === "string" ? body.categoryId : null;
  const dueDate = typeof body?.dueDate === "string" ? new Date(body.dueDate) : null;
  const estimatedHours =
    typeof body?.estimatedHours === "number" ? body.estimatedHours : null;
  const progress = typeof body?.progress === "number" ? body.progress : 0;
  const priority =
    typeof body?.priority === "string" && body.priority in TaskPriority
      ? (body.priority as TaskPriority)
      : TaskPriority.NONE;
  const description =
    typeof body?.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const status =
    typeof body?.status === "string" && body.status in TaskStatus
      ? (body.status as TaskStatus)
      : TaskStatus.TODO;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title,
      categoryId,
      dueDate,
      estimatedHours,
      progress,
      status,
      priority,
      description,
    },
  });

  return NextResponse.json({ task }, { status: 201 });
}

// PATCH /api/tasks - update done status { id: string, done: boolean }
export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const statusStr =
    typeof body?.status === "string" && body.status in TaskStatus ? body.status : null;
  const status = statusStr ? (statusStr as TaskStatus) : null;
  const progress =
    typeof body?.progress === "number" && body.progress >= 0 ? body.progress : null;
  const categoryId = typeof body?.categoryId === "string" ? body.categoryId : undefined;
  const dueDate = typeof body?.dueDate === "string" ? new Date(body.dueDate) : undefined;
  const estimatedHours =
    typeof body?.estimatedHours === "number" ? body.estimatedHours : undefined;
  const priority =
    typeof body?.priority === "string" && body.priority in TaskPriority
      ? (body.priority as TaskPriority)
      : undefined;
  const description =
    typeof body?.description === "string" ? body.description.trim() : undefined;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (status !== null) data.status = status;
  if (progress !== null) data.progress = progress;
  if (categoryId !== undefined) data.categoryId = categoryId;
  if (dueDate !== undefined) data.dueDate = dueDate;
  if (estimatedHours !== undefined) data.estimatedHours = estimatedHours;
  if (priority !== undefined) data.priority = priority;
  if (description !== undefined) data.description = description;

  const result = await prisma.task.updateMany({
    where: { id, userId: user.id },
    data,
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/tasks - delete task { id: string }
export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const result = await prisma.task.deleteMany({
    where: { id, userId: user.id },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

