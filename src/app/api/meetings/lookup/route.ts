import { NextResponse } from "next/server";
import { db } from "@/db";
import { 
  tarkieMeetings as tarkieMeetingsTable, 
  meetingAttendees as meetingAttendeesTable 
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/meetings/lookup
 * MIGRATED TO DRIZZLE
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const qr = url.searchParams.get("qr")?.trim();
    const id = url.searchParams.get("id")?.trim();

    if (!qr && !id) {
      return NextResponse.json({ error: "Missing id or qr parameter" }, { status: 400 });
    }

    const conditions = id ? eq(tarkieMeetingsTable.id, id) : eq(tarkieMeetingsTable.qrCode, qr!);
    
    const meetingRows = await db.select().from(tarkieMeetingsTable).where(conditions).limit(1);
    const meeting = meetingRows[0];

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Count attendees
    const countRows = await db.select({ count: sql<number>`count(*)` })
      .from(meetingAttendeesTable)
      .where(eq(meetingAttendeesTable.meetingId, meeting.id));
    
    const attendeesCount = countRows[0]?.count || 0;

    return NextResponse.json({
      id: meeting.id,
      meetingId: meeting.id,
      title: meeting.title,
      companyName: meeting.companyName,
      meetingType: meeting.meetingType,
      scheduledAt: meeting.scheduledAt,
      status: meeting.status,
      attendeesCount,
    });
  } catch (error: any) {
    console.error("Lookup meeting error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to lookup meeting" },
      { status: 500 }
    );
  }
}
