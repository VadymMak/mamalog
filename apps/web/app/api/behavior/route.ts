import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredSession, getUserId } from "@/lib/session";

const ALLOWED_CATEGORIES = [
  "aggression",
  "avoidance",
  "stereotypy",
  "sensory_overload",
  "regression",
  "hyperactivity",
  "anxiety",
] as const;

type BehaviorCategory = (typeof ALLOWED_CATEGORIES)[number];

function isAllowedCategory(value: string): value is BehaviorCategory {
  return (ALLOWED_CATEGORIES as readonly string[]).includes(value);
}

interface PostBody {
  logEntryId: string;
  category: string;
  context?: string;
  trigger?: string;
  intensity?: number;
  duration?: number;
  mediaUrl?: string;
}

// ─── POST /api/behavior ───────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const body: PostBody = await req.json();
    const { logEntryId, category, context, trigger, intensity, duration, mediaUrl } = body;

    if (!logEntryId) {
      return NextResponse.json(
        { success: false, error: "logEntryId is required" },
        { status: 400 }
      );
    }

    if (!category || !isAllowedCategory(category)) {
      return NextResponse.json(
        {
          success: false,
          error: `category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (
      intensity !== undefined &&
      (typeof intensity !== "number" ||
        intensity < 1 ||
        intensity > 10 ||
        !Number.isInteger(intensity))
    ) {
      return NextResponse.json(
        { success: false, error: "intensity must be an integer between 1 and 10" },
        { status: 400 }
      );
    }

    // Verify logEntry exists and belongs to session user
    const logEntry = await prisma.logEntry.findUnique({
      where: { id: logEntryId },
      select: { userId: true },
    });

    if (!logEntry) {
      return NextResponse.json(
        { success: false, error: "Log entry not found" },
        { status: 404 }
      );
    }

    if (logEntry.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const behavior = await prisma.behaviorLog.create({
      data: {
        logEntryId,
        category,
        context: context ?? null,
        trigger: trigger ?? null,
        intensity: intensity ?? null,
        duration: duration ?? null,
        mediaUrl: mediaUrl ?? null,
      },
    });

    return NextResponse.json({ success: true, data: behavior }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/behavior] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── GET /api/behavior ────────────────────────────────────────────────────────
// Supports two query modes:
//   ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD  → date-range query (for calendar dots)
//   ?logEntryId=xxx                            → single log entry query (existing)

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const { searchParams } = req.nextUrl;
    const logEntryId = searchParams.get("logEntryId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // ── Date-range mode ────────────────────────────────────────────────────
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(`${endDate}T23:59:59.999Z`);

      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return NextResponse.json(
          { success: false, error: "Invalid date range" },
          { status: 400 }
        );
      }

      const behaviors = await prisma.behaviorLog.findMany({
        where: {
          logEntry: { userId },
          createdAt: { gte: start, lte: end },
        },
        select: {
          id: true,
          category: true,
          intensity: true,
          createdAt: true,
          logEntry: { select: { date: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      return NextResponse.json({ success: true, data: behaviors });
    }

    // ── logEntryId mode (existing behaviour) ──────────────────────────────
    if (!logEntryId) {
      return NextResponse.json(
        { success: false, error: "Provide logEntryId or startDate+endDate" },
        { status: 400 }
      );
    }

    // Verify ownership
    const logEntry = await prisma.logEntry.findUnique({
      where: { id: logEntryId },
      select: { userId: true },
    });

    if (!logEntry) {
      return NextResponse.json(
        { success: false, error: "Log entry not found" },
        { status: 404 }
      );
    }

    if (logEntry.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const behaviors = await prisma.behaviorLog.findMany({
      where: { logEntryId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: behaviors });
  } catch (err) {
    console.error("[GET /api/behavior] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
