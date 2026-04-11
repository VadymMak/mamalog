import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey, adminAuthResponse } from "@/lib/adminAuth";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = checkAdminKey(req);
  if (!auth.ok) return adminAuthResponse(auth);

  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [
      totalUsers,
      pendingSpecialists,
      totalLogEntries,
      activeTodayEntries,
      premiumCount,
      aiUsageToday,
      totalBookmarks,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.specialist.count({ where: { status: "PENDING" } }),
      prisma.logEntry.count(),
      prisma.logEntry.findMany({
        where: { createdAt: { gte: todayStart } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.subscription.count({ where: { status: "active", plan: { in: ["MONTHLY", "YEARLY"] } } }),
      prisma.aIUsageLog.count({ where: { createdAt: { gte: todayStart } } }).catch(() => 0),
      prisma.bookmark.count().catch(() => 0),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        activeToday: activeTodayEntries.length,
        pendingSpecialists,
        totalLogEntries,
        premiumCount,
        aiUsageToday,
        totalBookmarks,
        mrr: null,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/stats]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
