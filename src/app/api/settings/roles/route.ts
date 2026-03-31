import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { roles as rolesTable } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 
 * GET /api/settings/roles — fetch all roles 
 * MIGRATED TO DRIZZLE
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const roles = await db.select()
      .from(rolesTable)
      .orderBy(asc(rolesTable.createdAt));

    return NextResponse.json(roles);
  } catch (error: any) {
    console.error("GET /api/settings/roles error:", error);
    return NextResponse.json([], { status: 200 }); // Return empty array on error for UI stability
  }
}

/** 
 * POST /api/settings/roles — create a new role 
 * MIGRATED TO DRIZZLE
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const id = `role-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newRole = {
      id,
      name: name.trim(),
      createdAt: new Date().toISOString()
    };

    await db.insert(rolesTable).values(newRole);

    return NextResponse.json(newRole, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/settings/roles error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
