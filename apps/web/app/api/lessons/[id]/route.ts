import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredSession, getUserId } from "@/lib/session";

// ─── Ownership guard ──────────────────────────────────────────────────────────

async function getOwnedLesson(
  id: string,
  userId: string
): Promise<
  | { ok: true; lesson: Awaited<ReturnType<typeof prisma.lesson.findUnique>> & object; response?: undefined }
  | { ok: false; response: NextResponse }
> {
  const lesson = await prisma.lesson.findUnique({ where: { id } });

  if (!lesson) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Lesson not found" },
        { status: 404 }
      ),
    };
  }

  if (lesson.userId !== userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, lesson };
}

// ─── GET /api/lessons/[id] ────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const { id } = await params;
    const result = await getOwnedLesson(id, userId);
    if (!result.ok) return result.response;

    return NextResponse.json({ success: true, data: result.lesson });
  } catch (err) {
    console.error("[GET /api/lessons/[id]] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/lessons/[id] ──────────────────────────────────────────────────

interface PatchBody {
  title?: string;
  type?: string;
  color?: string;
  startTime?: string;
  duration?: number;
  location?: string | null;
  specialist?: string | null;
  repeat?: string;
  repeatDays?: string[];
  date?: string;
  note?: string | null;
  rating?: number | null;
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
    const result = await getOwnedLesson(id, userId);
    if (!result.ok) return result.response;

    const body: PatchBody = await req.json();

    if (
      body.rating !== undefined &&
      body.rating !== null &&
      (typeof body.rating !== "number" ||
        body.rating < 1 ||
        body.rating > 10 ||
        !Number.isInteger(body.rating))
    ) {
      return NextResponse.json(
        { success: false, error: "rating must be an integer between 1 and 10" },
        { status: 400 }
      );
    }

    if (body.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return NextResponse.json(
        { success: false, error: "date must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    if (body.startTime !== undefined && !/^\d{2}:\d{2}$/.test(body.startTime)) {
      return NextResponse.json(
        { success: false, error: "startTime must be in HH:MM format" },
        { status: 400 }
      );
    }

    const updated = await prisma.lesson.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.startTime !== undefined && { startTime: body.startTime }),
        ...(body.duration !== undefined && { duration: body.duration }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.specialist !== undefined && { specialist: body.specialist }),
        ...(body.repeat !== undefined && { repeat: body.repeat }),
        ...(body.repeatDays !== undefined && { repeatDays: body.repeatDays }),
        ...(body.date !== undefined && { date: body.date }),
        ...(body.note !== undefined && { note: body.note }),
        ...(body.rating !== undefined && { rating: body.rating }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[PATCH /api/lessons/[id]] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/lessons/[id] ─────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const { id } = await params;
    const result = await getOwnedLesson(id, userId);
    if (!result.ok) return result.response;

    await prisma.lesson.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("[DELETE /api/lessons/[id]] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
