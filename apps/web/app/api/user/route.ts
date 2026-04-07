import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Auth helper (supports NextAuth session + mobile Bearer userId) ───────────

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return session.user.id;

  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7) || null;
  }
  return null;
}

// ─── GET /api/user ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: { select: { plan: true, status: true, expiresAt: true } },
      _count: { select: { logEntries: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  // Distinct diary days
  const logDates = await prisma.logEntry.findMany({
    where: { userId },
    select: { date: true },
  });
  const diaryDays = new Set(logDates.map((e) => e.date.toDateString())).size;

  // Total behavior episodes
  const episodes = await prisma.behaviorLog.count({
    where: { logEntry: { userId } },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      childName: user.childName,
      childAge: user.childAge,
      diagnosis: user.diagnosis,
      language: user.language,
      subscription: user.subscription,
      stats: {
        diaryDays,
        totalEntries: user._count.logEntries,
        episodes,
      },
    },
  });
}

// ─── PATCH /api/user ───────────────────────────────────────────────────────────

interface PatchBody {
  name?: string;
  childName?: string;
  childAge?: number;
  diagnosis?: string;
}

export async function PATCH(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body: PatchBody = await req.json();
  const { name, childName, childAge, diagnosis } = body;

  const updateData: PatchBody = {};
  if (name !== undefined) updateData.name = name.trim() || undefined;
  if (childName !== undefined) updateData.childName = childName.trim() || null as unknown as undefined;
  if (childAge !== undefined) updateData.childAge = childAge > 0 ? childAge : null as unknown as undefined;
  if (diagnosis !== undefined) updateData.diagnosis = diagnosis.trim() || null as unknown as undefined;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, childName: true, childAge: true, diagnosis: true },
  });

  return NextResponse.json({ success: true, data: updated });
}
