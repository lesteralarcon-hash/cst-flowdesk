import { NextResponse } from "next/server";
import { db } from "@/db";
import { apps as appsTable } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { name, description, icon, href, isActive, sortOrder, provider } = await req.json();
    
    await db.update(appsTable)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(href !== undefined && { href }),
        ...(isActive !== undefined && { isActive: !!isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(provider !== undefined && { provider: provider ?? null }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(appsTable.id, params.id));

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Update app error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const rows = await db.select({ isBuiltIn: appsTable.isBuiltIn })
      .from(appsTable)
      .where(eq(appsTable.id, params.id))
      .limit(1);

    if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (rows[0].isBuiltIn) return NextResponse.json({ error: "Built-in apps cannot be deleted" }, { status: 400 });
    
    await db.delete(appsTable).where(eq(appsTable.id, params.id));
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Delete app error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
