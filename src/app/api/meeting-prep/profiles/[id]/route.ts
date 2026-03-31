import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * PATCH /api/meeting-prep/profiles/[id]
 * Update a client profile (partial update)
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.clientProfile.findUnique({ where: { id: params.id } });
    if (!profile || profile.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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

    const setClauses: string[] = [];
    const values: any[] = [];

    if (companyName !== undefined) { setClauses.push("companyName = ?"); values.push(companyName); }
    if (industry !== undefined) { setClauses.push("industry = ?"); values.push(industry); }
    if (modulesAvailed !== undefined) { setClauses.push("modulesAvailed = ?"); values.push(JSON.stringify(modulesAvailed)); }
    if (engagementStatus !== undefined) { setClauses.push("engagementStatus = ?"); values.push(engagementStatus); }
    if (primaryContact !== undefined) { setClauses.push("primaryContact = ?"); values.push(primaryContact); }
    if (primaryContactEmail !== undefined) { setClauses.push("primaryContactEmail = ?"); values.push(primaryContactEmail); }
    if (specialConsiderations !== undefined) { setClauses.push("specialConsiderations = ?"); values.push(specialConsiderations); }

    if (setClauses.length > 0) {
      setClauses.push("updatedAt = ?");
      values.push(new Date().toISOString());
      
      values.push(params.id);
      await prisma.$executeRawUnsafe(
        `UPDATE ClientProfile SET ${setClauses.join(", ")} WHERE id = ?`,
        ...values
      );
    }

    const updated = await prisma.clientProfile.findUnique({ where: { id: params.id } });
    return NextResponse.json({
      ...updated,
      modulesAvailed: JSON.parse((updated as any)?.modulesAvailed || "[]"),
    });
  } catch (error: any) {
    console.error("PATCH /api/meeting-prep/profiles/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
  }
}

/**
 * DELETE /api/meeting-prep/profiles/[id]
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.clientProfile.findUnique({ where: { id: params.id } });
    if (!profile || profile.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.clientProfile.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete profile error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete profile" }, { status: 500 });
  }
}
