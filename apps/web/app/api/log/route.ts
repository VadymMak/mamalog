import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredSession, getUserId } from "@/lib/session";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostBody {
  date?: string;
  moodScore: number;
  emotions: string[];
  triggers: string[];
  notes?: string;
  sleepHours?: number;
  energyLevel?: number;
  audioUrl?: string;
  transcript?: string;
}

interface DateRangeFilter {
  gte?: Date;
  lte?: Date;
}

interface LogEntryFilter {
  userId: string;
  date?: DateRangeFilter;
}

// ─── POST /api/log ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const body: PostBody = await req.json();
    const {
      date,
      moodScore,
      emotions,
      triggers,
      notes,
      sleepHours,
      energyLevel,
      audioUrl,
      transcript,
    } = body;

    if (
      typeof moodScore !== "number" ||
      moodScore < 1 ||
      moodScore > 10 ||
      !Number.isInteger(moodScore)
    ) {
      return NextResponse.json(
        { success: false, error: "moodScore must be an integer between 1 and 10" },
        { status: 400 }
      );
    }

    if (
      energyLevel !== undefined &&
      (typeof energyLevel !== "number" ||
        energyLevel < 1 ||
        energyLevel > 10 ||
        !Number.isInteger(energyLevel))
    ) {
      return NextResponse.json(
        { success: false, error: "energyLevel must be an integer between 1 and 10" },
        { status: 400 }
      );
    }

    if (!Array.isArray(emotions) || !Array.isArray(triggers)) {
      return NextResponse.json(
        { success: false, error: "emotions and triggers must be arrays" },
        { status: 400 }
      );
    }

    const entry = await prisma.logEntry.create({
      data: {
        userId,
        date: date ? new Date(date) : new Date(),
        moodScore,
        emotions,
        triggers,
        notes: notes ?? null,
        sleepHours: sleepHours ?? null,
        energyLevel: energyLevel ?? null,
        audioUrl: audioUrl ?? null,
        transcript: transcript ?? null,
      },
      include: { behaviors: true },
    });

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/log] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── GET /api/log ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const { searchParams } = req.nextUrl;
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const where: LogEntryFilter = { userId };

    if (date) {
      const start = new Date(date);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setUTCHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (from || to) {
      const dateFilter: DateRangeFilter = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setUTCHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
      }
      where.date = dateFilter;
    }

    const [entries, total] = await prisma.$transaction([
      prisma.logEntry.findMany({
        where,
        include: { behaviors: true },
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.logEntry.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: entries,
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error("[GET /api/log] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
