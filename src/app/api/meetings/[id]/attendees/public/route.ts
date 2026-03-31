import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meetingAttendees as meetingAttendeesTable } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/meetings/[id]/attendees/public
 * MIGRATED TO DRIZZLE
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const attendees = await db.select({
      id: meetingAttendeesTable.id,
      fullName: meetingAttendeesTable.fullName,
      companyName: meetingAttendeesTable.companyName,
      position: meetingAttendeesTable.position,
      attendanceStatus: meetingAttendeesTable.attendanceStatus,
    })
    .from(meetingAttendeesTable)
    .where(and(
      eq(meetingAttendeesTable.meetingId, params.id),
      eq(meetingAttendeesTable.registrationType, "pre-registered")
    ))
    .orderBy(asc(meetingAttendeesTable.fullName));

    return NextResponse.json({ attendees });
  } catch (err) {
    console.error("Public attendees error:", err);
    return NextResponse.json({ attendees: [] });
  }
}
