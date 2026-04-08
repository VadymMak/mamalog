import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey, adminAuthResponse } from "@/lib/adminAuth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/users/[id]  — full user detail for CRM
export async function GET(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = checkAdminKey(req);
  if (!auth.ok) return adminAuthResponse(auth);

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        language: true,
        isSuperUser: true,
        childName: true,
        childAge: true,
        diagnosis: true,
        createdAt: true,
        subscription: {
          select: { plan: true, status: true, expiresAt: true },
        },
        _count: {
          select: { logEntries: true },
        },
        logEntries: {
          select: {
            date: true,
            moodScore: true,
            notes: true,
            _count: { select: { behaviors: true } },
          },
          orderBy: { date: "desc" },
          take: 5,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const totalBehaviors = user.logEntries.reduce((sum, e) => sum + e._count.behaviors, 0);

    const { _count, logEntries, ...rest } = user;

    return NextResponse.json({
      success: true,
      data: {
        ...rest,
        totalLogs: _count.logEntries,
        totalBehaviors,
        lastActiveAt: logEntries[0]?.date ?? null,
        recentLogs: logEntries.map((e) => ({
          date: e.date,
          moodScore: e.moodScore,
          notes: e.notes,
        })),
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/users/[id]]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
