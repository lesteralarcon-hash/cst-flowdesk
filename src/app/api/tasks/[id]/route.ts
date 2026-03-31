import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { taskHistory as taskHistoryTable } from "@/db/schema";
import { auth } from "@/auth";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 
 * GET /api/tasks/[id] — fetch single task with history 
 * MIGRATED TO DRIZZLE
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const history = await db.select()
      .from(taskHistoryTable)
      .where(eq(taskHistoryTable.timelineItemId, params.id))
      .orderBy(desc(taskHistoryTable.createdAt));

    return NextResponse.json(history);
  } catch (error: any) {
    console.error("GET /api/tasks/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
