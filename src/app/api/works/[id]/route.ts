import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { savedWorks as savedWorksTable } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 
 * GET /api/works/[id] — fetch a single saved work 
 * MIGRATED TO DRIZZLE
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db.select()
      .from(savedWorksTable)
      .where(and(eq(savedWorksTable.id, params.id), eq(savedWorksTable.userId, currentUserId)))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error("Get work error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch work" }, { status: 500 });
  }
}

/** 
 * PATCH /api/works/[id] — update a saved work 
 * MIGRATED TO DRIZZLE
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workId } = params;

    // Verify ownership first
    const existingRows = await db.select()
      .from(savedWorksTable)
      .where(and(eq(savedWorksTable.id, workId), eq(savedWorksTable.userId, currentUserId)))
      .limit(1);

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const ALLOWED = ["title", "data", "clientProfileId", "flowCategory"];
    const updateData: any = { updatedAt: new Date().toISOString() };

    let hasUpdate = false;
    for (const key of ALLOWED) {
      if (key in body && body[key] !== undefined) {
        updateData[key] = body[key] ?? null;
        hasUpdate = true;
      }
    }

    if (!hasUpdate) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await db.update(savedWorksTable).set(updateData).where(eq(savedWorksTable.id, workId));

    const updatedRows = await db.select().from(savedWorksTable).where(eq(savedWorksTable.id, workId)).limit(1);
    return NextResponse.json(updatedRows[0]);
  } catch (error: any) {
    console.error("Update work error:", error);
    return NextResponse.json({ error: error.message || "Failed to update work" }, { status: 500 });
  }
}

/** 
 * DELETE /api/works/[id] — delete a saved work 
 * MIGRATED TO DRIZZLE
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workId } = params;

    // Verify ownership first
    const existingRows = await db.select()
      .from(savedWorksTable)
      .where(and(eq(savedWorksTable.id, workId), eq(savedWorksTable.userId, currentUserId)))
      .limit(1);

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.delete(savedWorksTable).where(eq(savedWorksTable.id, workId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete work error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete work" }, { status: 500 });
  }
}
