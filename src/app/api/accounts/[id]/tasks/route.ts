import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { 
  timelineItems as timelineItemsTable, 
  projects as projectsTable, 
  taskAssignments as taskAssignmentsTable, 
  users as usersTable 
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, desc, inArray, or } from "drizzle-orm";

/**
 * GET /api/accounts/[id]/tasks
 * MIGRATED TO DRIZZLE
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: accountId } = params;

    // 1. Fetch all project IDs belonging to this account
    const projects = await db.select({ id: projectsTable.id, name: projectsTable.name })
      .from(projectsTable)
      .where(eq(projectsTable.clientProfileId, accountId));
    const projectIds = projects.map(p => p.id);

    // 2. Fetch all TimelineItems (tasks) for this account
    const tasks = await db.select()
      .from(timelineItemsTable)
      .where(and(
        or(
          eq(timelineItemsTable.clientProfileId, accountId),
          projectIds.length > 0 ? inArray(timelineItemsTable.projectId, projectIds) : undefined
        ),
        eq(timelineItemsTable.archived, false)
      ))
      .orderBy(desc(timelineItemsTable.createdAt));

    if (tasks.length === 0) {
      return NextResponse.json([]);
    }

    // 3. Fetch related data (projects and assignments)
    const taskIds = tasks.map(t => t.id);
    
    // Fetch assignments with user data
    const assignmentsWithUsers = await db.select({
      taskId: taskAssignmentsTable.timelineItemId,
      user: {
        id: usersTable.id,
        name: usersTable.name,
        image: usersTable.image,
        email: usersTable.email,
      }
    })
    .from(taskAssignmentsTable)
    .innerJoin(usersTable, eq(usersTable.id, taskAssignmentsTable.userId))
    .where(inArray(taskAssignmentsTable.timelineItemId, taskIds));

    const assignmentsByTask: Record<string, any[]> = {};
    assignmentsWithUsers.forEach(a => {
      if (!assignmentsByTask[a.taskId]) assignmentsByTask[a.taskId] = [];
      assignmentsByTask[a.taskId].push(a);
    });

    const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));

    // 4. Map to the structure expected by the AccountHub frontend
    const mappedTasks = tasks.map((t: any) => ({
      id: t.id,
      title: t.subject,
      status: t.status,
      due: t.plannedEnd,
      project: projectMap[t.projectId] || null,
      assignedUser: assignmentsByTask[t.id]?.[0]?.user || null,
      tempOwner: t.owner,
      assignments: assignmentsByTask[t.id] || []
    }));

    return NextResponse.json(mappedTasks);
  } catch (error: any) {
    console.error("error fetching account tasks:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
