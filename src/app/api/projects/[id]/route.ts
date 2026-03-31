import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects as projectsTable } from "@/db/schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";

/**
 * GET /api/projects/[id]
 * MIGRATED TO DRIZZLE
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = params;

    const rows = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1);
    
    const project = rows[0] || null;

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error: any) {
    console.error("error fetching project:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
