import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Mobile uses Bearer {userId} — refresh validates user still exists
// and returns a fresh 30-day expiresAt so the client can reset its timer.
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authHeader.replace("Bearer ", "").replace(/"/g, "").trim();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const expiresAt = new Date(Date.now() + 86400_000 * 30).toISOString();

    return NextResponse.json({ success: true, expiresAt });
  } catch {
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
