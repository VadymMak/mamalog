import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey } from "@/lib/adminAuth";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = checkAdminKey(req);
  if (!auth.ok) return auth.response;

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
          createdAt: true,
          subscription: {
            select: { plan: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.user.count(),
    ]);

    return NextResponse.json({ success: true, data: users, total, limit, offset });
  } catch (err) {
    console.error("[GET /api/admin/users]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
