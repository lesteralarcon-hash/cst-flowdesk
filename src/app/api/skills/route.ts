import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skills as skillsTable } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, asc } from "drizzle-orm";

/** 
 * GET /api/skills — list skills, optionally filtered 
 * MIGRATED TO DRIZZLE
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const categoryQuery = searchParams.get("category");
    const subcategoryQuery = searchParams.get("subcategory");
    const slugQuery = searchParams.get("slug");
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const conditions = [];
    if (categoryQuery) conditions.push(eq(skillsTable.category, categoryQuery));
    if (subcategoryQuery) conditions.push(eq(skillsTable.subcategory, subcategoryQuery));
    if (slugQuery) conditions.push(eq(skillsTable.slug, slugQuery));
    if (activeOnly) conditions.push(eq(skillsTable.isActive, true));

    const skills = await db.select()
      .from(skillsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(skillsTable.category), asc(skillsTable.sortOrder), asc(skillsTable.name));

    return NextResponse.json(skills);
  } catch (err: any) {
    console.error("GET /api/skills error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** 
 * POST /api/skills — create a new skill 
 * MIGRATED TO DRIZZLE
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, category, subcategory, slug, content, isActive, sortOrder } = body;

    if (!name || !category || !content) {
      return NextResponse.json(
        { error: "name, category, and content are required" },
        { status: 400 }
      );
    }

    const newId = `sk_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await db.insert(skillsTable).values({
      id: newId,
      name,
      description: description || "",
      category,
      subcategory: subcategory || null,
      slug: slug || null,
      content,
      isActive: isActive !== false,
      isSystem: false,
      sortOrder: sortOrder || 0,
      createdAt: now,
      updatedAt: now
    });

    const rows = await db.select().from(skillsTable).where(eq(skillsTable.id, newId)).limit(1);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err: any) {
    console.error("POST /api/skills error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
