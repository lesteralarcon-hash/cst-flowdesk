import { NextResponse } from "next/server";
import { db } from "@/db";
import { users as usersTable } from "@/db/schema";
import { sql } from "drizzle-orm";
import path from "path";

export const dynamic = "force-dynamic";

/** 
 * GET /api/health — basic health check 
 * MIGRATED TO DRIZZLE
 */
export async function GET() {
  try {
    const dbPath = path.resolve(process.cwd(), "dev.db");
    const countResult = await db.run(sql`SELECT COUNT(*) as count FROM User`);
    const testCount = (countResult as any).rows?.[0]?.count || 0;

    return NextResponse.json({ 
      status: "HEALTHY", 
      dbPath, 
      userCount: testCount,
      now: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("Health Check Error:", err);
    return NextResponse.json({ 
      status: "ERROR", 
      message: err.message, 
      stack: err.stack,
      cwd: process.cwd(),
      envDbUrl: process.env.DATABASE_URL
    }, { status: 500 });
  }
}
