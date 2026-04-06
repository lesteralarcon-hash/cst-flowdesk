import { NextResponse } from "next/server";
import { db } from "@/db";
import { clientProfiles as clientProfilesTable, meetingPrepSessions as meetingPrepSessionsTable, users as usersTable } from "@/db/schema";
import { auth } from "@/auth";
import { eq, desc, inArray } from "drizzle-orm";
import { ensureUserInDb } from "@/lib/utils/auth-sync";

export const dynamic = "force-dynamic";

/**
 * GET /api/meeting-prep/profiles
 * Fetch all client profiles for the current user
 * MIGRATED TO DRIZZLE
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Drizzle: Get all profiles
    const profiles = await db.select()
      .from(clientProfilesTable)
      .orderBy(desc(clientProfilesTable.createdAt));

    // Fetch meeting prep sessions separately
    const profileIds = profiles.map((p: any) => p.id);
    let sessions: any[] = [];
    if (profileIds.length > 0) {
      sessions = await db.select()
        .from(meetingPrepSessionsTable)
        .where(inArray(meetingPrepSessionsTable.clientProfileId, profileIds))
        .orderBy(desc(meetingPrepSessionsTable.updatedAt));
    }

    // Merge sessions into profiles
    const sessionsByProfile: Record<string, any[]> = {};
    for (const s of sessions) {
      const pid = s.clientProfileId;
      if (!sessionsByProfile[pid]) sessionsByProfile[pid] = [];
      sessionsByProfile[pid].push(s);
    }

    const formatted = profiles.map((p: any) => ({
      ...p,
      modulesAvailed: (() => { try { return JSON.parse(p.modulesAvailed || "[]"); } catch { return []; } })(),
      meetingPrepSessions: sessionsByProfile[p.id] || [],
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Fetch profiles error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch profiles" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meeting-prep/profiles
 * Create a new client profile
 * MIGRATED TO DRIZZLE
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      companyName,
      industry,
      modulesAvailed,
      engagementStatus,
      primaryContact,
      primaryContactEmail,
      specialConsiderations,
    } = body;

    if (!companyName?.trim()) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    // ENSURE: Synchronize user with DB to prevent FK failure
    await ensureUserInDb(session);

    const id = `cp_${Date.now()}`;
    const now = new Date().toISOString();

    // Drizzle: Direct insert with all fields
    await db.insert(clientProfilesTable).values({
      id,
      userId,
      companyName: companyName.trim(),
      industry: industry || "general",
      modulesAvailed: JSON.stringify(modulesAvailed || []),
      engagementStatus: engagementStatus || "confirmed",
      primaryContact: primaryContact || "",
      primaryContactEmail: primaryContactEmail || "",
      specialConsiderations: specialConsiderations || "",
      createdAt: now,
      updatedAt: now
    });

    // Read back
    const created = await db.select()
      .from(clientProfilesTable)
      .where(eq(clientProfilesTable.id, id))
      .limit(1);

    const profile = created[0] || {};
    return NextResponse.json({
      ...profile,
      modulesAvailed: (() => { try { return JSON.parse(profile.modulesAvailed || "[]"); } catch { return []; } })(),
    }, { status: 201 });

  } catch (error: any) {
    console.error("POST /api/meeting-prep/profiles error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create profile" },
      { status: 500 }
    );
  }
}
