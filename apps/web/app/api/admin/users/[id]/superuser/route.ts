import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey, adminAuthResponse } from "@/lib/adminAuth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/users/[id]/superuser  — toggle isSuperUser flag
export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = checkAdminKey(req);
  if (!auth.ok) return adminAuthResponse(auth);

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isSuperUser: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isSuperUser: !user.isSuperUser },
      select: { id: true, email: true, isSuperUser: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[POST /api/admin/users/[id]/superuser]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
