import { NextResponse } from "next/server";
import { db } from "@/db";
import { 
  timelineItems as timelineItemsTable, 
  userCapacities as userCapacitiesTable 
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, ne } from "drizzle-orm";
import { findNextAvailableSlot, CapacityRow } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

/** 
 * POST /api/tasks/suggest-slot 
 * MIGRATED TO DRIZZLE
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { owner, durationHours, afterDate } = await req.json();
    if (!owner || !durationHours) {
      return NextResponse.json({ error: "owner and durationHours required" }, { status: 400 });
    }

    const after = afterDate ? new Date(afterDate) : new Date();

    // Fetch all active tasks for conflict-aware slot finding
    const tasks = await db.select({
      owner: timelineItemsTable.owner,
      plannedStart: timelineItemsTable.plannedStart,
      plannedEnd: timelineItemsTable.plannedEnd,
      durationHours: timelineItemsTable.durationHours,
      status: timelineItemsTable.status,
      archived: timelineItemsTable.archived
    })
    .from(timelineItemsTable)
    .where(and(eq(timelineItemsTable.archived, false), ne(timelineItemsTable.status, "completed")));

    // Fetch owner capacity
    let capacityRow: CapacityRow;
    try {
      const rows = await db.select({
        owner: userCapacitiesTable.owner,
        dailyHours: userCapacitiesTable.dailyHours,
        restDays: userCapacitiesTable.restDays
      })
      .from(userCapacitiesTable)
      .where(eq(userCapacitiesTable.owner, owner))
      .limit(1);

      capacityRow = rows[0] ?? { owner, dailyHours: 8, restDays: "Saturday,Sunday" };
    } catch {
      capacityRow = { owner, dailyHours: 8, restDays: "Saturday,Sunday" };
    }

    const suggestedStart = findNextAvailableSlot(owner, durationHours, after, tasks as any[], capacityRow);
    const suggestedEnd = new Date(suggestedStart.getTime() + durationHours * 3600000);

    return NextResponse.json({
      suggestedStart: suggestedStart.toISOString(),
      suggestedEnd: suggestedEnd.toISOString(),
    });
  } catch (error: any) {
    console.error("Suggest Slot Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
