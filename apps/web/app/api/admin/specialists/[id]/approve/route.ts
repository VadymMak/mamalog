import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey } from "@/lib/adminAuth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = checkAdminKey(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const specialist = await prisma.specialist.findUnique({ where: { id } });
    if (!specialist) {
      return NextResponse.json(
        { success: false, error: "Specialist not found" },
        { status: 404 }
      );
    }

    await prisma.specialist.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/admin/specialists/[id]/approve]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
