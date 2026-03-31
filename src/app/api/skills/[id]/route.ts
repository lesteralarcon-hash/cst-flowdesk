import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skills as skillsTable } from "@/db/schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";

/** 
 * PATCH /api/skills/[id] — update a skill 
 * MIGRATED TO DRIZZLE
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { name, description, category, subcategory, slug, content, isActive, sortOrder } = body;

    const rows = await db.select().from(skillsTable).where(eq(skillsTable.id, id)).limit(1);
    const existing = rows[0];
    if (!existing) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: new Date().toISOString()
    };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (subcategory !== undefined) updateData.subcategory = subcategory || null;
    if (slug !== undefined) updateData.slug = slug || null;
    if (content !== undefined) updateData.content = content;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    await db.update(skillsTable).set(updateData).where(eq(skillsTable.id, id));

    const updatedRows = await db.select().from(skillsTable).where(eq(skillsTable.id, id)).limit(1);
    return NextResponse.json(updatedRows[0]);
  } catch (err: any) {
    console.error("PATCH /api/skills/[id] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** 
 * DELETE /api/skills/[id] — delete a skill 
 * MIGRATED TO DRIZZLE
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const rows = await db.select().from(skillsTable).where(eq(skillsTable.id, id)).limit(1);
    const existing = rows[0];
    if (!existing) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }
    
    if (existing.isSystem) {
      return NextResponse.json(
        { error: "System skills cannot be deleted. You can disable them instead." },
        { status: 403 }
      );
    }

    await db.delete(skillsTable).where(eq(skillsTable.id, id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/skills/[id] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
