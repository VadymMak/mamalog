import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredSession, getUserId } from "@/lib/session";

// GET /api/bookmarks/[articleId] — check if article is bookmarked
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);
  const { articleId } = await params;

  try {
    const bookmark = await prisma.bookmark.findUnique({
      where: { userId_articleId: { userId, articleId } },
      select: { id: true },
    });

    return NextResponse.json({ success: true, data: { bookmarked: !!bookmark } });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/bookmarks/[articleId] — toggle bookmark (add if not exists, remove if exists)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);
  const { articleId } = await params;

  try {
    const existing = await prisma.bookmark.findUnique({
      where: { userId_articleId: { userId, articleId } },
    });

    if (existing) {
      await prisma.bookmark.delete({
        where: { userId_articleId: { userId, articleId } },
      });
      return NextResponse.json({ success: true, data: { bookmarked: false } });
    }

    await prisma.bookmark.create({
      data: { userId, articleId },
    });
    return NextResponse.json({ success: true, data: { bookmarked: true } });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
