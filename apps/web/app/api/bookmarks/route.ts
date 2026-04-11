import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredSession, getUserId } from "@/lib/session";

// GET /api/bookmarks — returns list of bookmarked articleIds for the user
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      select: { articleId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: bookmarks.map((b) => b.articleId),
    });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
