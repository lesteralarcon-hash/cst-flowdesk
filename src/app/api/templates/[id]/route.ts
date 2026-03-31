import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { 
  timelineTemplates as timelineTemplatesTable, 
  templateTasks as templateTasksTable 
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

/** 
 * GET /api/templates/[id] — get a single template with tasks 
 * MIGRATED TO DRIZZLE
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: templateId } = params;

    const templates = await db.select()
      .from(timelineTemplatesTable)
      .where(eq(timelineTemplatesTable.id, templateId))
      .limit(1);

    if (templates.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const tasks = await db.select()
      .from(templateTasksTable)
      .where(eq(templateTasksTable.templateId, templateId))
      .orderBy(asc(templateTasksTable.sortOrder));

    return NextResponse.json({
      ...templates[0],
      tasks
    });
  } catch (err: any) {
    console.error("GET /api/templates/[id] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** 
 * PUT /api/templates/[id] — update a template and its tasks 
 * MIGRATED TO DRIZZLE
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: templateId } = params;
    const body = await req.json();
    const { name, description, restDays, type, tasks } = body;

    await db.transaction(async (tx) => {
      // 1. Update template
      await tx.update(timelineTemplatesTable)
        .set({
          name,
          description,
          restDays: restDays || "Saturday,Sunday",
          type: type || "project",
          updatedAt: new Date().toISOString()
        })
        .where(eq(timelineTemplatesTable.id, templateId));

      // 2. Replace tasks if provided
      if (tasks && Array.isArray(tasks)) {
        await tx.delete(templateTasksTable).where(eq(templateTasksTable.templateId, templateId));

        if (tasks.length > 0) {
          const newTasks = tasks.map((t: any, idx: number) => ({
            id: `task_${templateId.substring(0,8)}_${idx}_${randomBytes(4).toString("hex")}`,
            templateId,
            taskCode: t.taskCode || `CUSTOM-${String(idx + 1).padStart(4, "0")}`,
            subject: t.subject,
            defaultDuration: Number(t.defaultDuration) || 8,
            sortOrder: idx + 1,
          }));
          
          for (const nt of newTasks) {
            await tx.insert(templateTasksTable).values(nt);
          }
        }
      }
    });

    // Fetch updated
    const templates = await db.select().from(timelineTemplatesTable).where(eq(timelineTemplatesTable.id, templateId)).limit(1);
    const updatedTasks = await db.select().from(templateTasksTable).where(eq(templateTasksTable.templateId, templateId)).orderBy(asc(templateTasksTable.sortOrder));

    return NextResponse.json({
      ...templates[0],
      tasks: updatedTasks
    });
  } catch (err: any) {
    console.error("PUT /api/templates/[id] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** 
 * DELETE /api/templates/[id] 
 * MIGRATED TO DRIZZLE
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: templateId } = params;

    await db.transaction(async (tx) => {
      // Drizzle handles cascading if configured in schema, but we'll be explicit for safety
      await tx.delete(templateTasksTable).where(eq(templateTasksTable.templateId, templateId));
      await tx.delete(timelineTemplatesTable).where(eq(timelineTemplatesTable.id, templateId));
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/templates/[id] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
