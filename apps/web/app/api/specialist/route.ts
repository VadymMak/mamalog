import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── GET /api/specialist — public, returns all APPROVED specialists ─────────

export async function GET() {
  const specialists = await prisma.specialist.findMany({
    where: { status: "APPROVED" },
    select: {
      id: true,
      name: true,
      specialty: true,
      bio: true,
      photoUrl: true,
      experience: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, specialists });
}
