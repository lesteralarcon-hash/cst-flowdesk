import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { 
  dailyTasks as dailyTasksTable, 
  timelineItems as timelineItemsTable,
  projects as projectsTable 
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, gte, lte, asc, or } from "drizzle-orm";

/**
 * POST /api/daily-tasks
 * MIGRATED TO DRIZZLE
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { timelineItemId, title, date, startTime, endTime, allottedHours } = await req.json();

    if (!title || !date) {
      return NextResponse.json({ error: "Title and Date are required" }, { status: 400 });
    }

    const newId = `dt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const result = await db.insert(dailyTasksTable).values({
      id: newId,
      userId,
      timelineItemId: timelineItemId || null,
      title,
      date: new Date(date).toISOString(),
      startTime: startTime ? new Date(startTime).toISOString() : null,
      endTime: endTime ? new Date(endTime).toISOString() : null,
      allottedHours: allottedHours || 1,
      status: "todo",
      createdAt: now,
      updatedAt: now
    });

    if (timelineItemId) {
      await db.update(timelineItemsTable)
        .set({ status: "in-progress" })
        .where(eq(timelineItemsTable.id, timelineItemId));
    }

    const rows = await db.select().from(dailyTasksTable).where(eq(dailyTasksTable.id, newId)).limit(1);
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error("Daily Task Create Error:", error);
    return NextResponse.json({ error: error.message || "Failed to deploy task" }, { status: 500 });
  }
}

/**
 * GET /api/daily-tasks
 * MIGRATED TO DRIZZLE
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const projectId = searchParams.get("projectId");
    
    const conditions = [eq(dailyTasksTable.userId, currentUserId)];
    
    if (dateStr) {
      const d = new Date(dateStr);
      conditions.push(gte(dailyTasksTable.date, new Date(d.setHours(0, 0, 0, 0)).toISOString()));
      conditions.push(lte(dailyTasksTable.date, new Date(d.setHours(23, 59, 59, 999)).toISOString()));
    } else if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0, 0);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      conditions.push(gte(dailyTasksTable.date, start.toISOString()));
      conditions.push(lte(dailyTasksTable.date, end.toISOString()));
    }

    if (projectId && projectId !== "ALL") {
      conditions.push(eq(timelineItemsTable.projectId, projectId));
    }

    const tasks = await db.select({
      id: dailyTasksTable.id,
      userId: dailyTasksTable.userId,
      timelineItemId: dailyTasksTable.timelineItemId,
      title: dailyTasksTable.title,
      date: dailyTasksTable.date,
      startTime: dailyTasksTable.startTime,
      endTime: dailyTasksTable.endTime,
      allottedHours: dailyTasksTable.allottedHours,
      actualHours: dailyTasksTable.actualHours,
      status: dailyTasksTable.status,
      createdAt: dailyTasksTable.createdAt,
      updatedAt: dailyTasksTable.updatedAt,
      projectName: projectsTable.name
    })
    .from(dailyTasksTable)
    .leftJoin(timelineItemsTable, eq(dailyTasksTable.timelineItemId, timelineItemsTable.id))
    .leftJoin(projectsTable, eq(timelineItemsTable.projectId, projectsTable.id))
    .where(and(...conditions))
    .orderBy(asc(dailyTasksTable.date));

    // Normalize for frontend (include timelineItem property)
    const normalized = tasks.map(t => ({
      ...t,
      timelineItem: t.projectName ? { project: { name: t.projectName } } : null
    }));

    return NextResponse.json(normalized);
  } catch (error: any) {
    console.error("Fetch Daily Tasks Error:", error);
    return NextResponse.json({ error: "Failed to fetch daily tasks" }, { status: 500 });
  }
}

/**
 * PATCH /api/daily-tasks
 * MIGRATED TO DRIZZLE
 */
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, status, actualHours } = await req.json();
    const updateData: any = { status, updatedAt: new Date().toISOString() };
    if (actualHours !== undefined) updateData.actualHours = actualHours;

    await db.update(dailyTasksTable)
      .set(updateData)
      .where(and(eq(dailyTasksTable.id, id), eq(dailyTasksTable.userId, currentUserId)));

    const rows = await db.select().from(dailyTasksTable).where(eq(dailyTasksTable.id, id)).limit(1);
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error("Update Daily Task Error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
