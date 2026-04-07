import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredSession, getUserId } from "@/lib/session";

// ─── Shared ownership guard ───────────────────────────────────────────────────

async function getOwnedEntry(
  id: string,
  userId: string
): Promise<
  | { ok: true; entry: Awaited<ReturnType<typeof prisma.logEntry.findUnique>> & object; response?: undefined }
  | { ok: false; response: NextResponse }
> {
  const entry = await prisma.logEntry.findUnique({
    where: { id },
    include: { behaviors: true },
  });

  if (!entry) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Log entry not found" },
        { status: 404 }
      ),
    };
  }

  if (entry.userId !== userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, entry };
}

// ─── GET /api/log/[id] ────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const { id } = await params;
    const result = await getOwnedEntry(id, userId);
    if (!result.ok) return result.response;

    return NextResponse.json({ success: true, data: result.entry });
  } catch (err) {
    console.error("[GET /api/log/[id]] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/log/[id] ──────────────────────────────────────────────────────

interface PatchBody {
  date?: string;
  moodScore?: number;
  emotions?: string[];
  triggers?: string[];
  notes?: string | null;
  sleepHours?: number | null;
  energyLevel?: number | null;
  audioUrl?: string | null;
  transcript?: string | null;
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
    const result = await getOwnedEntry(id, userId);
    if (!result.ok) return result.response;

    const body: PatchBody = await req.json();

    if (
      body.moodScore !== undefined &&
      (typeof body.moodScore !== "number" ||
        body.moodScore < 1 ||
        body.moodScore > 10 ||
        !Number.isInteger(body.moodScore))
    ) {
      return NextResponse.json(
        { success: false, error: "moodScore must be an integer between 1 and 10" },
        { status: 400 }
      );
    }

    if (
      body.energyLevel !== undefined &&
      body.energyLevel !== null &&
      (typeof body.energyLevel !== "number" ||
        body.energyLevel < 1 ||
        body.energyLevel > 10 ||
        !Number.isInteger(body.energyLevel))
    ) {
      return NextResponse.json(
        { success: false, error: "energyLevel must be an integer between 1 and 10" },
        { status: 400 }
      );
    }

    const updated = await prisma.logEntry.update({
      where: { id },
      data: {
        ...(body.date !== undefined && { date: new Date(body.date) }),
        ...(body.moodScore !== undefined && { moodScore: body.moodScore }),
        ...(body.emotions !== undefined && { emotions: body.emotions }),
        ...(body.triggers !== undefined && { triggers: body.triggers }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.sleepHours !== undefined && { sleepHours: body.sleepHours }),
        ...(body.energyLevel !== undefined && { energyLevel: body.energyLevel }),
        ...(body.audioUrl !== undefined && { audioUrl: body.audioUrl }),
        ...(body.transcript !== undefined && { transcript: body.transcript }),
      },
      include: { behaviors: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[PATCH /api/log/[id]] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/log/[id] ─────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const { id } = await params;
    const result = await getOwnedEntry(id, userId);
    if (!result.ok) return result.response;

    await prisma.$transaction([
      prisma.behaviorLog.deleteMany({ where: { logEntryId: id } }),
      prisma.logEntry.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("[DELETE /api/log/[id]] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
