import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey, adminAuthResponse } from "@/lib/adminAuth";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = checkAdminKey(req);
  if (!auth.ok) return adminAuthResponse(auth);

  try {
    const specialists = await prisma.specialist.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        name: true,
        email: true,
        specialty: true,
        bio: true,
        diplomaUrl: true,
        experience: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: specialists });
  } catch (err) {
    console.error("[GET /api/admin/specialists/pending]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
