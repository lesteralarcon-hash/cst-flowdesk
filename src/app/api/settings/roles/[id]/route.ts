import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { roles as rolesTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 
 * DELETE /api/settings/roles/[id] 
 * MIGRATED TO DRIZZLE
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await db.delete(rolesTable).where(eq(rolesTable.id, params.id));
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/settings/roles/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
