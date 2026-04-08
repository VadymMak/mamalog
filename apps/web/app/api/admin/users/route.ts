import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey, adminAuthResponse } from "@/lib/adminAuth";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = checkAdminKey(req);
  if (!auth.ok) return adminAuthResponse(auth);

  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  try {
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          language: true,
          // isSuperUser omitted — column not yet in prod DB
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
            select: { date: true },
            orderBy: { date: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.user.count(),
    ]);

    const data = users.map((u) => {
      const { _count, logEntries, ...rest } = u;
      return {
        ...rest,
        totalLogs: _count.logEntries,
        lastActiveAt: logEntries[0]?.date ?? null,
      };
    });

    return NextResponse.json({ success: true, data, total, limit, offset });
  } catch (err) {
    console.error("[GET /api/admin/users]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
