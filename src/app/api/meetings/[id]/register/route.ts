import { NextResponse } from "next/server";
import { db } from "@/db";
import { 
  tarkieMeetings as tarkieMeetingsTable, 
  meetingAttendees as meetingAttendeesTable 
} from "@/db/schema";
import { eq, and, or, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * POST /api/meetings/[id]/register
 * MIGRATED TO DRIZZLE
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const {
      attendeeId,
      fullName,
      position,
      companyName,
      mobileNumber,
      email,
      consentGiven,
    } = body;

    if (!consentGiven) {
      return NextResponse.json(
        { error: "Consent is required" },
        { status: 400 }
      );
    }

    // Fetch meeting
    const meetingRows = await db.select().from(tarkieMeetingsTable).where(eq(tarkieMeetingsTable.id, id)).limit(1);
    const meeting = meetingRows[0];

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    let attendee: any = null;

    // ── Path A: attendeeId provided — mark a pre-registered attendee present ──
    if (attendeeId) {
      const attendeeRows = await db.select().from(meetingAttendeesTable).where(and(eq(meetingAttendeesTable.id, attendeeId), eq(meetingAttendeesTable.meetingId, id))).limit(1);
      attendee = attendeeRows[0];
      
      if (!attendee) {
        return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
      }
      
      if (attendee.attendanceStatus === "confirmed" || attendee.attendanceStatus === "attended") {
        return NextResponse.json({ message: "Already registered", attendee }, { status: 200 });
      }
      
      await db.update(meetingAttendeesTable)
        .set({ attendanceStatus: "attended", consentGiven: true })
        .where(eq(meetingAttendeesTable.id, attendeeId));
      
      const updatedRows = await db.select().from(meetingAttendeesTable).where(eq(meetingAttendeesTable.id, attendeeId)).limit(1);
      return NextResponse.json({ message: "Registration successful", attendee: updatedRows[0] }, { status: 200 });
    }

    // ── Path B: new walk-in registration ──────────────────────────────────────
    if (!fullName) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    // Check if already registered by email or phone
    const lookupConditions: any[] = [];
    if (email) lookupConditions.push(eq(meetingAttendeesTable.email, email));
    if (mobileNumber) lookupConditions.push(eq(meetingAttendeesTable.mobileNumber, mobileNumber));

    if (lookupConditions.length > 0) {
      const existingRows = await db.select()
        .from(meetingAttendeesTable)
        .where(and(eq(meetingAttendeesTable.meetingId, id), or(...lookupConditions)))
        .limit(1);
      attendee = existingRows[0];
    }

    if (attendee && attendee.registrationType === "pre-registered") {
      // Confirm pre-registered attendee matched by email/mobile
      await db.update(meetingAttendeesTable)
        .set({ attendanceStatus: "attended", consentGiven: true })
        .where(eq(meetingAttendeesTable.id, attendee.id));
      
      const updatedRows = await db.select().from(meetingAttendeesTable).where(eq(meetingAttendeesTable.id, attendee.id)).limit(1);
      attendee = updatedRows[0];
    } else if (!attendee) {
      // Create new walk-in attendee
      const newId = `att_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      await db.insert(meetingAttendeesTable).values({
        id: newId,
        meetingId: id,
        fullName,
        position: position || null,
        companyName: companyName || null,
        mobileNumber: mobileNumber || null,
        email: email || null,
        registrationType: "qr-scan",
        attendanceStatus: "confirmed",
        consentGiven: true,
        createdAt: new Date().toISOString()
      });
      
      const newRows = await db.select().from(meetingAttendeesTable).where(eq(meetingAttendeesTable.id, newId)).limit(1);
      attendee = newRows[0];
    } else {
      // Already exists and confirmed
      return NextResponse.json(
        { message: "Already registered", attendee },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        message: "Registration successful",
        attendee,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to register" },
      { status: 500 }
    );
  }
}
