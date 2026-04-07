import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey } from "@/lib/adminAuth";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = checkAdminKey(req);
  if (!auth.ok) return auth.response;

  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [totalUsers, pendingSpecialists, totalLogEntries, activeTodayResult] =
      await prisma.$transaction([
        prisma.user.count(),
        prisma.specialist.count({ where: { status: "PENDING" } }),
        prisma.logEntry.count(),
        prisma.logEntry.groupBy({
          by: ["userId"],
          where: { createdAt: { gte: todayStart } },
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        activeToday: activeTodayResult.length,
        pendingSpecialists,
        totalLogEntries,
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
