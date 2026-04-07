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

// ─── GET /api/behavior?logEntryId=xxx ─────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const logEntryId = req.nextUrl.searchParams.get("logEntryId");

    if (!logEntryId) {
      return NextResponse.json(
        { success: false, error: "logEntryId query param is required" },
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
