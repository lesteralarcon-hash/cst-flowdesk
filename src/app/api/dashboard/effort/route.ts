import { NextResponse } from "next/server";
import { db } from "@/db";
import { 
  projects as projectsTable, 
  timelineItems as timelineItemsTable, 
  dailyTasks as dailyTasksTable, 
  kanbanBoards as kanbanBoardsTable, 
  kanbanLanes as kanbanLanesTable 
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, inArray, lte, gte, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function periodRange(period: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  if (period === "daily") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const label = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return { start, end, label };
  }
  if (period === "week") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // start on Monday
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() + diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { start, end, label: `${fmt(start)} – ${fmt(end)}` };
  }
  // month
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const label = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return { start, end, label };
}

/** Compute actual hours from timestamps (calendar hours), fallback to durationHours for completed tasks */
function actualHours(task: any): number {
  if (task.actualStart && task.actualEnd) {
    const ms = new Date(task.actualEnd).getTime() - new Date(task.actualStart).getTime();
    const h = ms / 3600000;
    // sanity cap: no more than 3× the budget (handles bad data)
    return Math.min(Math.max(h, 0), (task.durationHours ?? 8) * 3);
  }
  // completed but no actual timestamps → use budget as proxy
  if (task.status === "completed") return task.durationHours ?? 8;
  return 0;
}

/**
 * GET /api/dashboard/effort
 * MIGRATED TO DRIZZLE
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month";
    const { start, end, label } = periodRange(period);

    // Active projects for this user
    const projects = await db.select({
      id: projectsTable.id,
      name: projectsTable.name,
      companyName: projectsTable.companyName,
    })
    .from(projectsTable)
    .where(and(eq(projectsTable.status, "active"), eq(projectsTable.userId, userId)))
    .orderBy(projectsTable.name);

    if (!projects.length) {
      return NextResponse.json({
        period: { start: start.toISOString(), end: end.toISOString(), label },
        byProject: [],
        byOwner: [],
      });
    }

    const projectIds = projects.map((p: any) => p.id);
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // Tasks overlapping with the period (not archived, not recurring templates)
    const tasks = await db.select({
      id: timelineItemsTable.id,
      projectId: timelineItemsTable.projectId,
      status: timelineItemsTable.status,
      owner: timelineItemsTable.owner,
      durationHours: timelineItemsTable.durationHours,
      actualStart: timelineItemsTable.actualStart,
      actualEnd: timelineItemsTable.actualEnd,
      plannedStart: timelineItemsTable.plannedStart,
      plannedEnd: timelineItemsTable.plannedEnd,
      kanbanLaneId: timelineItemsTable.kanbanLaneId,
    })
    .from(timelineItemsTable)
    .where(and(
      inArray(timelineItemsTable.projectId, projectIds),
      eq(timelineItemsTable.archived, false),
      eq(timelineItemsTable.isRecurringTemplate, false),
      sql`${timelineItemsTable.plannedStart} <= ${endISO}`,
      sql`${timelineItemsTable.plannedEnd} >= ${startISO}`
    ));

    // DailyTask allotted/actual hours for tasks in this period
    const taskIds = tasks.map((t: any) => t.id);
    const allottedByTask = new Map<string, { allotted: number; actual: number }>();
    
    if (taskIds.length > 0) {
      const dailyTotals = await db.select({
        timelineItemId: dailyTasksTable.timelineItemId,
        totalAllotted: sql<number>`SUM(${dailyTasksTable.allottedHours})`,
        totalActual: sql<number>`SUM(COALESCE(${dailyTasksTable.actualHours}, 0))`
      })
      .from(dailyTasksTable)
      .where(and(
        inArray(dailyTasksTable.timelineItemId, taskIds),
        sql`${dailyTasksTable.date} >= ${startISO}`,
        sql`${dailyTasksTable.date} <= ${endISO}`
      ))
      .groupBy(dailyTasksTable.timelineItemId);

      dailyTotals.forEach((r: any) => {
        allottedByTask.set(r.timelineItemId!, {
          allotted: Number(r.totalAllotted) || 0,
          actual: Number(r.totalActual) || 0,
        });
      });
    }

    // Kanban boards + lanes for all active projects
    const boards = await db.select({ id: kanbanBoardsTable.id, projectId: kanbanBoardsTable.projectId })
      .from(kanbanBoardsTable)
      .where(inArray(kanbanBoardsTable.projectId, projectIds));

    const boardIds = boards.map((b: any) => b.id);
    let lanes: any[] = [];
    if (boardIds.length > 0) {
      lanes = await db.select({
        id: kanbanLanesTable.id,
        boardId: kanbanLanesTable.boardId,
        name: kanbanLanesTable.name,
        mappedStatus: kanbanLanesTable.mappedStatus,
        color: kanbanLanesTable.color,
        position: kanbanLanesTable.position,
      })
      .from(kanbanLanesTable)
      .where(inArray(kanbanLanesTable.boardId, boardIds))
      .orderBy(kanbanLanesTable.position);
    }

    const lanesByProject = new Map<string, any[]>();
    boards.forEach((b: any) => {
      lanesByProject.set(b.projectId, lanes.filter(l => l.boardId === b.id));
    });

    // ── Per-project aggregation ──
    const byProject = projects
      .map((project: any) => {
        const ptasks = tasks.filter((t: any) => t.projectId === project.id);
        if (!ptasks.length) return null;

        const projectLanes = lanesByProject.get(project.id) ?? [];
        let budget = 0, logged = 0, remaining = 0, allotted = 0, eodActual = 0;
        const laneCount = new Map<string, number>();

        for (const t of ptasks) {
          const dh = t.durationHours ?? 8;
          budget += dh;
          if (t.status === "completed") {
            logged += actualHours(t);
          } else {
            remaining += dh;
          }
          const dt = allottedByTask.get(t.id);
          if (dt) { allotted += dt.allotted; eodActual += dt.actual; }

          // Kanban placement
          const laneKey = t.kanbanLaneId
            ?? projectLanes.find((l: any) => l.mappedStatus === t.status)?.id
            ?? null;
          if (laneKey) laneCount.set(laneKey, (laneCount.get(laneKey) ?? 0) + 1);
        }

        const forecast = logged + remaining;
        const variance = budget - forecast; // positive = under budget

        const kanban = projectLanes.map((l: any) => ({
          laneId: l.id,
          laneName: l.name,
          mappedStatus: l.mappedStatus,
          color: l.color ?? "#64748b",
          count: laneCount.get(l.id) ?? 0,
        }));

        return {
          projectId: project.id,
          name: project.name,
          companyName: project.companyName,
          budget: Math.round(budget * 10) / 10,
          logged: Math.round(logged * 10) / 10,
          remaining: Math.round(remaining * 10) / 10,
          forecast: Math.round(forecast * 10) / 10,
          variance: Math.round(variance * 10) / 10,
          allotted: Math.round(allotted * 10) / 10,
          eodActual: Math.round(eodActual * 10) / 10,
          taskCount: ptasks.length,
          completedCount: ptasks.filter((t: any) => t.status === "completed").length,
          kanban,
          hasBoard: projectLanes.length > 0,
        };
      })
      .filter(Boolean);

    // ── Per-owner aggregation ──
    const ownerMap = new Map<string, { budget: number; logged: number; remaining: number; allotted: number; eodActual: number; projects: Map<string, any> }>();
    for (const t of tasks) {
      const owner = t.owner ?? "Unassigned";
      if (!ownerMap.has(owner)) ownerMap.set(owner, { budget: 0, logged: 0, remaining: 0, allotted: 0, eodActual: 0, projects: new Map() });
      const o = ownerMap.get(owner)!;
      
      if (!o.projects.has(t.projectId)) {
        o.projects.set(t.projectId, {
          projectId: t.projectId,
          projectName: projects.find((p: any) => p.id === t.projectId)?.name || "Unknown Project",
          budget: 0, logged: 0, remaining: 0
        });
      }
      const op = o.projects.get(t.projectId)!;

      const dh = t.durationHours ?? 8;
      o.budget += dh;
      op.budget += dh;

      if (t.status === "completed") {
        const actual = actualHours(t);
        o.logged += actual;
        op.logged += actual;
      } else {
        o.remaining += dh;
        op.remaining += dh;
      }
      const dt = allottedByTask.get(t.id);
      if (dt) { o.allotted += dt.allotted; o.eodActual += dt.actual; }
    }

    const byOwner = Array.from(ownerMap.entries())
      .map(([owner, m]) => ({
        owner,
        budget: Math.round(m.budget * 10) / 10,
        logged: Math.round(m.logged * 10) / 10,
        remaining: Math.round(m.remaining * 10) / 10,
        forecast: Math.round((m.logged + m.remaining) * 10) / 10,
        variance: Math.round((m.budget - m.logged - m.remaining) * 10) / 10,
        allotted: Math.round(m.allotted * 10) / 10,
        eodActual: Math.round(m.eodActual * 10) / 10,
        projects: Array.from(m.projects.values()).map(p => ({
          ...p,
          budget: Math.round(p.budget * 10) / 10,
          logged: Math.round(p.logged * 10) / 10,
          remaining: Math.round(p.remaining * 10) / 10,
          forecast: Math.round((p.logged + p.remaining) * 10) / 10,
          variance: Math.round((p.budget - p.logged - p.remaining) * 10) / 10,
        })).sort((a, b) => b.budget - a.budget)
      }))
      .sort((a, b) => b.budget - a.budget);

    return NextResponse.json({
      period: { start: start.toISOString(), end: end.toISOString(), label },
      byProject,
      byOwner,
    });
  } catch (error: any) {
    console.error("GET /api/dashboard/effort error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
