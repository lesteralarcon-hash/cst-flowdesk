import { NextResponse } from "next/server";
import { db } from "@/db";
import { timelineItems as timelineItemsTable, projects as projectsTable } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, asc, isNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 
 * GET /api/task-list — simplified flat list of parent tasks 
 * MIGRATED TO DRIZZLE
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const showArchived = searchParams.get("showArchived") === "true";

    const conditions = [
      eq(timelineItemsTable.archived, showArchived),
      isNull(timelineItemsTable.parentId)
    ];
    if (projectId && projectId !== "ALL") {
      conditions.push(eq(timelineItemsTable.projectId, projectId));
    }

    const rows = await db.select({
      id: timelineItemsTable.id,
      projectId: timelineItemsTable.projectId,
      taskCode: timelineItemsTable.taskCode,
      subject: timelineItemsTable.subject,
      plannedStart: timelineItemsTable.plannedStart,
      plannedEnd: timelineItemsTable.plannedEnd,
      status: timelineItemsTable.status,
      archived: timelineItemsTable.archived,
      sortOrder: timelineItemsTable.sortOrder,
      projectName: projectsTable.name
    })
    .from(timelineItemsTable)
    .leftJoin(projectsTable, eq(timelineItemsTable.projectId, projectsTable.id))
    .where(and(...conditions))
    .orderBy(asc(timelineItemsTable.sortOrder));

    const tasks = rows.map(r => ({
      ...r,
      project: { name: r.projectName }
    }));

    return NextResponse.json(tasks);
  } catch (err: any) {
    console.error("Task List Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
