import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meetingAttendees as meetingAttendeesTable } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/meetings/[id]/attendees/lookup
 * MIGRATED TO DRIZZLE
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.trim();
    const mobile = searchParams.get("mobile")?.trim();

    if (!email && !mobile) {
      return NextResponse.json({ attendee: null });
    }

    const orConditions: any[] = [];
    if (email) orConditions.push(eq(meetingAttendeesTable.email, email));
    if (mobile) orConditions.push(eq(meetingAttendeesTable.mobileNumber, mobile));

    const results = await db.select({
      id: meetingAttendeesTable.id,
      fullName: meetingAttendeesTable.fullName,
      position: meetingAttendeesTable.position,
      companyName: meetingAttendeesTable.companyName,
      email: meetingAttendeesTable.email,
      mobileNumber: meetingAttendeesTable.mobileNumber,
      attendanceStatus: meetingAttendeesTable.attendanceStatus,
    })
    .from(meetingAttendeesTable)
    .where(and(
      eq(meetingAttendeesTable.meetingId, params.id),
      eq(meetingAttendeesTable.registrationType, "pre-registered"),
      or(...orConditions)
    ))
    .limit(1);

    return NextResponse.json({ attendee: results[0] || null });
  } catch (err: any) {
    console.error("Attendee lookup error:", err);
    return NextResponse.json({ attendee: null });
  }
}
