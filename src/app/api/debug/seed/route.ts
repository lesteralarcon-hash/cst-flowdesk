import { NextResponse } from "next/server";
import { db } from "@/db";
import { users as usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

/** 
 * GET /api/debug/seed — create a mock admin for local development 
 * MIGRATED TO DRIZZLE
 */
export async function GET() {
  try {
    console.log("Web Seeding: Creating mock admin...");
    
    const adminEmail = "admin@cst.com";
    const data = {
      id: "mock-admin-id",
      name: "CST Admin (Mock)",
      email: adminEmail,
      role: 'admin',
      status: 'approved',
      isSuperAdmin: true
    };

    await db.insert(usersTable)
      .values(data)
      .onConflictDoUpdate({
        target: usersTable.email,
        set: { role: 'admin', status: 'approved' }
      });

    const rows = await db.select().from(usersTable).where(eq(usersTable.email, adminEmail)).limit(1);

    return NextResponse.json({ 
      success: true, 
      message: "Admin seeded successfully", 
      user: rows[0] 
    });
  } catch (error: any) {
    console.error("Web Seed Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
