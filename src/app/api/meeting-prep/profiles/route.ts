import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/meeting-prep/profiles
 * Fetch all client profiles for the current user
 * PRODUCTION-SAFE: Uses raw SQL to avoid Prisma schema-mismatch crashes on Turso
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RAW SQL: Use SELECT * to avoid crash on missing columns
    const profiles = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM ClientProfile WHERE userId = ? ORDER BY createdAt DESC`,
      session.user.id
    );

    // Fetch meeting prep sessions separately (also raw SQL to be safe)
    const profileIds = profiles.map((p: any) => p.id);
    let sessions: any[] = [];
    if (profileIds.length > 0) {
      const placeholders = profileIds.map(() => "?").join(",");
      sessions = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM MeetingPrepSession
         WHERE clientProfileId IN (${placeholders})
         ORDER BY updatedAt DESC`,
        ...profileIds
      );
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
 * PRODUCTION-SAFE: 100% raw SQL with fallback INSERT for missing columns
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
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

    // STABILITY: Ensure the user record exists before creating profile (prevents FK error)
    try {
      const existing = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id FROM User WHERE id = ?`, session.user.id
      );
      if (existing.length === 0) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO User (id, name, email, role, status) VALUES (?, ?, ?, ?, 'approved')`,
          session.user.id,
          session.user.name || "CST User",
          session.user.email || `unknown_${Date.now()}@cst.com`,
          (session.user as any).role || "user"
        );
      }
    } catch (e) {
      console.warn("Profiles: User ensure failed (non-critical):", e);
    }

    // STABILITY: Add missing columns if they don't exist yet
    // Run silently — errors are expected if columns already exist
    const colMigrations = [
      `ALTER TABLE ClientProfile ADD COLUMN primaryContact TEXT`,
      `ALTER TABLE ClientProfile ADD COLUMN primaryContactEmail TEXT`,
      `ALTER TABLE ClientProfile ADD COLUMN companySize TEXT`,
      `ALTER TABLE ClientProfile ADD COLUMN specialConsiderations TEXT`,
      `ALTER TABLE ClientProfile ADD COLUMN modulesAvailed TEXT DEFAULT '[]'`,
      `ALTER TABLE ClientProfile ADD COLUMN engagementStatus TEXT DEFAULT 'confirmed'`,
    ];
    for (const sql of colMigrations) {
      try { await prisma.$executeRawUnsafe(sql); } catch { /* column already exists */ }
    }

    const id = `cp_${Date.now()}`;
    const now = new Date().toISOString();

    // STABILITY: Try full INSERT first; fall back to minimal INSERT if columns missing
    let insertError: any = null;
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO ClientProfile (id, userId, companyName, industry, modulesAvailed, engagementStatus, primaryContact, primaryContactEmail, specialConsiderations, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        session.user.id,
        companyName.trim(),
        industry || "general",
        JSON.stringify(modulesAvailed || []),
        engagementStatus || "confirmed",
        primaryContact || "",
        primaryContactEmail || "",
        specialConsiderations || "",
        now,
        now
      );
    } catch (e: any) {
      console.warn("Full INSERT failed, trying minimal INSERT:", e.message);
      insertError = e;
      // Fallback: minimal INSERT with only the core required columns
      await prisma.$executeRawUnsafe(
        `INSERT INTO ClientProfile (id, userId, companyName, industry, modulesAvailed, engagementStatus, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        session.user.id,
        companyName.trim(),
        industry || "general",
        JSON.stringify(modulesAvailed || []),
        engagementStatus || "confirmed",
        now,
        now
      );
    }

    // Read back — SELECT * for maximum safety
    const created = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM ClientProfile WHERE id = ?`, id
    );

    const profile = created[0] || {};
    return NextResponse.json({
      ...profile,
      modulesAvailed: (() => { try { return JSON.parse(profile.modulesAvailed || "[]"); } catch { return []; } })(),
      _insertFallbackUsed: !!insertError,
    }, { status: 201 });

  } catch (error: any) {
    console.error("POST /api/meeting-prep/profiles error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create profile" },
      { status: 500 }
    );
  }
}
