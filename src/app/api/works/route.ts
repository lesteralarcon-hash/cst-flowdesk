import { NextResponse } from "next/server";
import { db } from "@/db";
import { savedWorks as savedWorksTable } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 
 * GET /api/works — fetch saved work products 
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
    const appType = searchParams.get("appType");
    const clientProfileId = searchParams.get("clientProfileId");

    const conditions = [eq(savedWorksTable.userId, currentUserId)];
    if (appType) conditions.push(eq(savedWorksTable.appType, appType));
    if (clientProfileId) conditions.push(eq(savedWorksTable.clientProfileId, clientProfileId));

    const works = await db.select()
      .from(savedWorksTable)
      .where(and(...conditions))
      .orderBy(desc(savedWorksTable.updatedAt));

    return NextResponse.json(works);
  } catch (error: any) {
    console.error("Fetch works error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch works" }, { status: 500 });
  }
}

/** 
 * POST /api/works — save or update a work product 
 * MIGRATED TO DRIZZLE
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, appType, title, data, clientProfileId, flowCategory, status } = body;

    if (!appType || !title || !data) {
      return NextResponse.json({ error: "appType, title, and data are required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const workId = id || `sw_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

    await db.insert(savedWorksTable).values({
      id: workId,
      userId: currentUserId,
      appType,
      title,
      data,
      clientProfileId: clientProfileId || null,
      flowCategory: flowCategory || null,
      status: status || 'open',
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: savedWorksTable.id,
      set: {
        title,
        data,
        clientProfileId: clientProfileId || null,
        flowCategory: flowCategory || null,
        status: status || 'open',
        updatedAt: now
      }
    });

    const rows = await db.select().from(savedWorksTable).where(eq(savedWorksTable.id, workId)).limit(1);
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error("Save work error:", error);
    return NextResponse.json({ error: error.message || "Failed to save work" }, { status: 500 });
  }
}
