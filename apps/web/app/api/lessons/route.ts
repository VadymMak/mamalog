import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredSession, getUserId } from "@/lib/session";

// ─── Types ────────────────────────────────────────────────────────────────────

type LessonRepeat = "none" | "daily" | "weekly" | "biweekly";

interface PostBody {
  title: string;
  type: string;
  color?: string;
  startTime: string;
  duration: number;
  location?: string;
  specialist?: string;
  repeat?: LessonRepeat;
  repeatDays?: string[];
  date: string;
  note?: string;
}

interface LessonRow {
  id: string;
  userId: string;
  title: string;
  type: string;
  color: string;
  startTime: string;
  duration: number;
  location: string | null;
  specialist: string | null;
  repeat: string;
  repeatDays: string[];
  date: string;
  note: string | null;
  rating: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LessonResponse {
  id: string;
  title: string;
  type: string;
  color: string;
  startTime: string;
  duration: number;
  location: string | null;
  specialist: string | null;
  date: string;
  note: string | null;
  rating: number | null;
  isRecurring: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEEKDAY_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setUTCDate(result.getUTCDate() + n);
  return result;
}

function toResponse(lesson: LessonRow, date: string): LessonResponse {
  return {
    id: lesson.id,
    title: lesson.title,
    type: lesson.type,
    color: lesson.color,
    startTime: lesson.startTime,
    duration: lesson.duration,
    location: lesson.location,
    specialist: lesson.specialist,
    date,
    note: lesson.note,
    rating: lesson.rating,
    isRecurring: lesson.repeat !== "none",
  };
}

/**
 * Expand a single lesson into one occurrence per day within [start, end].
 * The lesson's own date acts as the anchor / repeat origin.
 */
function expandLesson(lesson: LessonRow, start: Date, end: Date): LessonResponse[] {
  const results: LessonResponse[] = [];
  const repeat = lesson.repeat as LessonRepeat;
  const origin = parseDateStr(lesson.date);

  if (repeat === "none") {
    // Include only if lesson.date is within [start, end]
    if (origin >= start && origin <= end) {
      results.push(toResponse(lesson, lesson.date));
    }
    return results;
  }

  // Walk through [start, end] day by day is fine for calendar ranges (≤ 90 days typical)
  const current = new Date(Math.max(start.getTime(), origin.getTime()));

  while (current <= end) {
    const dateStr = formatDate(current);
    const diffMs = current.getTime() - origin.getTime();
    const diffDays = Math.round(diffMs / 86_400_000);

    let matches = false;

    if (repeat === "daily") {
      matches = true;
    } else if (repeat === "weekly") {
      const weekday = current.getUTCDay();
      const originWeekday = origin.getUTCDay();
      matches =
        lesson.repeatDays.length > 0
          ? lesson.repeatDays.includes(
              Object.keys(WEEKDAY_MAP).find((k) => WEEKDAY_MAP[k] === weekday) ?? ""
            )
          : weekday === originWeekday;
    } else if (repeat === "biweekly") {
      const weekday = current.getUTCDay();
      const originWeekday = origin.getUTCDay();
      const diffWeeks = Math.floor(diffDays / 7);
      matches = weekday === originWeekday && diffWeeks % 2 === 0 && diffDays >= 0;
    }

    if (matches) {
      results.push(toResponse(lesson, dateStr));
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return results;
}

// ─── GET /api/lessons ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const { searchParams } = req.nextUrl;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "startDate and endDate query params are required" },
        { status: 400 }
      );
    }

    const start = parseDateStr(startDate);
    const end = parseDateStr(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return NextResponse.json(
        { success: false, error: "Invalid date range" },
        { status: 400 }
      );
    }

    // Fetch all lessons for user:
    // - non-recurring: date within range
    // - recurring: date <= endDate (origin can be before range start)
    const lessons = await prisma.lesson.findMany({
      where: {
        userId,
        OR: [
          { repeat: "none", date: { gte: startDate, lte: endDate } },
          { repeat: { not: "none" }, date: { lte: endDate } },
        ],
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    const expanded: LessonResponse[] = [];
    for (const lesson of lessons) {
      expanded.push(...expandLesson(lesson as LessonRow, start, end));
    }

    // Sort by date then startTime
    expanded.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });

    return NextResponse.json({ success: true, data: expanded, total: expanded.length });
  } catch (err) {
    console.error("[GET /api/lessons] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/lessons ────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const body: PostBody = await req.json();
    const {
      title,
      type,
      color,
      startTime,
      duration,
      location,
      specialist,
      repeat,
      repeatDays,
      date,
      note,
    } = body;

    if (!title || !type || !startTime || !date || typeof duration !== "number") {
      return NextResponse.json(
        { success: false, error: "title, type, startTime, date and duration are required" },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: "date must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    if (!/^\d{2}:\d{2}$/.test(startTime)) {
      return NextResponse.json(
        { success: false, error: "startTime must be in HH:MM format" },
        { status: 400 }
      );
    }

    const lesson = await prisma.lesson.create({
      data: {
        userId,
        title,
        type,
        color: color ?? "#6B3FA0",
        startTime,
        duration,
        location: location ?? null,
        specialist: specialist ?? null,
        repeat: repeat ?? "none",
        repeatDays: repeatDays ?? [],
        date,
        note: note ?? null,
      },
    });

    return NextResponse.json({ success: true, data: lesson }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/lessons] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
