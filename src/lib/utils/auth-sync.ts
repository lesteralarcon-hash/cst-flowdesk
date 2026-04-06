import { db } from "@/db";
import { users as usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Self-Healing User Sync Utility
 * 
 * Ensures that the currently authenticated user from NextAuth has a matching record 
 * in the application's 'User' table. This prevents foreign key constraint 
 * failures (500 errors) when users try to save projects or profiles for the first time.
 */
export async function ensureUserInDb(session: any) {
  const userId = session?.user?.id;
  if (!userId) return null;

  try {
    // 1. Check if user already exists
    const existing = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (existing.length > 0) {
      return userId;
    }

    // 2. If not, 'Self-Heal' by creating the user record
    console.log(`⚡ Syncing new user to database: ${userId} (${session.user.email})`);
    
    await db.insert(usersTable).values({
      id: userId,
      name: session.user.name || "CST Team Member",
      email: session.user.email || `user_${Date.now()}@cst.com`,
      role: (session.user as any).role || "user",
      status: "active",
    });

    return userId;
  } catch (error: any) {
    console.error("❌ User Sync Failed:", error.message);
    // We return the userId anyway to attempt the main operation, 
    // though it might still fail if the DB constraint is strict.
    return userId;
  }
}
