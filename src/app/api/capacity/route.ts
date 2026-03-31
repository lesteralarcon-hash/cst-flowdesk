import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { userCapacities as userCapacitiesTable } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

/**
 * GET /api/capacity
 * MIGRATED TO DRIZZLE
 */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await db.select({
      id: userCapacitiesTable.id,
      owner: userCapacitiesTable.owner,
      dailyHours: userCapacitiesTable.dailyHours,
      restDays: userCapacitiesTable.restDays
    })
    .from(userCapacitiesTable)
    .orderBy(asc(userCapacitiesTable.owner));
    
    return NextResponse.json(rows);
  } catch (err) {
    console.error("API Capacity GET error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

/**
 * POST /api/capacity
 * MIGRATED TO DRIZZLE
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { owner, dailyHours, restDays } = await req.json();
    if (!owner) return NextResponse.json({ error: "owner required" }, { status: 400 });

    const id = `cap_${owner}_${Date.now()}`;
    const hours = dailyHours ?? 8;
    const rest = restDays ?? "Saturday,Sunday";
    const now = new Date().toISOString();

    await db.insert(userCapacitiesTable)
      .values({
        id,
        owner,
        dailyHours: hours,
        restDays: rest,
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: userCapacitiesTable.owner,
        set: {
          dailyHours: hours,
          restDays: rest,
          updatedAt: now
        }
      });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("API Capacity POST error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
