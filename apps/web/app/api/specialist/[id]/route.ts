import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── GET /api/specialist/[id] — public ───────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const specialist = await prisma.specialist.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      specialty: true,
      bio: true,
      photoUrl: true,
      experience: true,
      status: true,
      createdAt: true,
    },
  });

  if (!specialist || specialist.status !== "APPROVED") {
    return NextResponse.json(
      { success: false, error: "Specialist not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: specialist });
}
