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

// ─── Shared ownership guard ───────────────────────────────────────────────────

async function getOwnedBehavior(
  id: string,
  userId: string
): Promise<
  | {
      ok: true;
      behavior: Awaited<ReturnType<typeof prisma.behaviorLog.findUnique>> & object;
      response?: undefined;
    }
  | { ok: false; response: NextResponse }
> {
  const behavior = await prisma.behaviorLog.findUnique({
    where: { id },
    include: {
      logEntry: { select: { userId: true } },
    },
  });

  if (!behavior) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Behavior log not found" },
        { status: 404 }
      ),
    };
  }

  if (behavior.logEntry.userId !== userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, behavior };
}

// ─── GET /api/behavior/[id] ───────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const { id } = await params;
    const result = await getOwnedBehavior(id, userId);
    if (!result.ok) return result.response;

    return NextResponse.json({ success: true, data: result.behavior });
  } catch (err) {
    console.error("[GET /api/behavior/[id]] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/behavior/[id] ─────────────────────────────────────────────────

interface PatchBody {
  category?: string;
  context?: string | null;
  trigger?: string | null;
  intensity?: number | null;
  duration?: number | null;
  mediaUrl?: string | null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const { id } = await params;
    const result = await getOwnedBehavior(id, userId);
    if (!result.ok) return result.response;

    const body: PatchBody = await req.json();

    if (body.category !== undefined && !isAllowedCategory(body.category)) {
      return NextResponse.json(
        {
          success: false,
          error: `category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (
      body.intensity !== undefined &&
      body.intensity !== null &&
      (typeof body.intensity !== "number" ||
        body.intensity < 1 ||
        body.intensity > 10 ||
        !Number.isInteger(body.intensity))
    ) {
      return NextResponse.json(
        { success: false, error: "intensity must be an integer between 1 and 10" },
        { status: 400 }
      );
    }

    const updated = await prisma.behaviorLog.update({
      where: { id },
      data: {
        ...(body.category !== undefined && { category: body.category }),
        ...(body.context !== undefined && { context: body.context }),
        ...(body.trigger !== undefined && { trigger: body.trigger }),
        ...(body.intensity !== undefined && { intensity: body.intensity }),
        ...(body.duration !== undefined && { duration: body.duration }),
        ...(body.mediaUrl !== undefined && { mediaUrl: body.mediaUrl }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[PATCH /api/behavior/[id]] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/behavior/[id] ────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const { id } = await params;
    const result = await getOwnedBehavior(id, userId);
    if (!result.ok) return result.response;

    await prisma.behaviorLog.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("[DELETE /api/behavior/[id]] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
