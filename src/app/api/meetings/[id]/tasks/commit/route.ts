import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { 
  tarkieMeetings as tarkieMeetingsTable, 
  timelineItems as timelineItemsTable,
  taskAssignments as taskAssignmentsTable,
  projects as projectsTable,
  clientProfiles as clientProfilesTable
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/meetings/[id]/tasks/commit
 * MIGRATED TO DRIZZLE
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const meetingId = params.id;
    const body = await req.json();
    const { tasks, projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required to commit tasks" }, { status: 400 });
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ error: "No tasks to commit" }, { status: 400 });
    }

    // Fetch meeting and join project/client to get companyName for prefix
    const meetingRows = await db.select({
      id: tarkieMeetingsTable.id,
      clientProfileId: tarkieMeetingsTable.clientProfileId,
      projectTitle: projectsTable.title,
      projectCompanyName: projectsTable.companyName,
      clientCompanyName: clientProfilesTable.companyName,
    })
    .from(tarkieMeetingsTable)
    .leftJoin(projectsTable, eq(tarkieMeetingsTable.projectId, projectsTable.id))
    .leftJoin(clientProfilesTable, eq(tarkieMeetingsTable.clientProfileId, clientProfilesTable.id))
    .where(eq(tarkieMeetingsTable.id, meetingId))
    .limit(1);

    const meeting = meetingRows[0];
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const companyName = meeting.clientCompanyName || meeting.projectCompanyName || "GEN";
    const prefix = companyName.split(" ")[0].replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase();

    const taskCodes: string[] = [];

    await db.transaction(async (tx) => {
      for (const task of tasks) {
        const ps = task.plannedStart ? new Date(task.plannedStart) : new Date();
        const pe = task.plannedEnd ? new Date(task.plannedEnd) : new Date(ps.getTime() + 3600000);
        const durationHours = Math.max(0.25, Math.round(((pe.getTime() - ps.getTime()) / 3600000) * 100) / 100);

        const numericPart = Math.floor(100000 + Math.random() * 900000);
        const taskCode = `TASK-${prefix}-${numericPart}`;
        const taskId = `task_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

        // Insert task
        await tx.insert(timelineItemsTable).values({
          id: taskId,
          projectId,
          clientProfileId: meeting.clientProfileId || null,
          taskCode,
          subject: task.title || "Untitled Task",
          plannedStart: ps.toISOString(),
          plannedEnd: pe.toISOString(),
          status: 'pending',
          durationHours,
          sortOrder: 0,
          archived: false,
          createdBy: userId
        });

        // Insert assignments
        if (task.assignedIds && Array.isArray(task.assignedIds) && task.assignedIds.length > 0) {
          const assignmentValues = task.assignedIds.map((uid: string) => ({
            id: `asgn_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
            timelineItemId: taskId,
            userId: uid,
          }));
          await tx.insert(taskAssignmentsTable).values(assignmentValues);
        }

        taskCodes.push(taskCode);
      }
    });

    return NextResponse.json({ success: true, count: tasks.length, codes: taskCodes });
  } catch (error: any) {
    console.error("Task commit error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to commit tasks" },
      { status: 500 }
    );
  }
}
