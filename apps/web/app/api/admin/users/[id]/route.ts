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
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [user, aiUsageTotal, aiUsageToday, totalBookmarks] = await Promise.all([
      prisma.user.findUnique({
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
      }),
      prisma.aIUsageLog.count({ where: { userId: id } }).catch(() => 0),
      prisma.aIUsageLog.count({ where: { userId: id, createdAt: { gte: todayStart } } }).catch(() => 0),
      prisma.bookmark.count({ where: { userId: id } }).catch(() => 0),
    ]);

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const totalBehaviors = user.logEntries.reduce((sum, e) => sum + e._count.behaviors, 0);

    // Count distinct active days from log entries
    const allLogDates = await prisma.logEntry.findMany({
      where: { userId: id },
      select: { date: true },
    });
    const daysActive = new Set(allLogDates.map((e) => e.date.toISOString().split("T")[0])).size;

    const { _count, logEntries, ...rest } = user;

    return NextResponse.json({
      success: true,
      data: {
        ...rest,
        totalLogs: _count.logEntries,
        totalBehaviors,
        daysActive,
        aiUsageTotal,
        aiUsageToday,
        totalBookmarks,
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
