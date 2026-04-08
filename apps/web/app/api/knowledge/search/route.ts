import { NextRequest, NextResponse } from "next/server";
import { searchKnowledge } from "@/lib/embeddings";
import { getRequiredSession } from "@/lib/session";

// ─── GET /api/knowledge/search?q=query&limit=5 ───────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = req.nextUrl;
    const query = searchParams.get("q")?.trim();
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "5", 10), 10);

    if (!query) {
      return NextResponse.json(
        { success: false, error: "q parameter is required" },
        { status: 400 }
      );
    }

    const results = await searchKnowledge(query, limit);

    return NextResponse.json({
      success: true,
      data: results.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content.slice(0, 500), // truncate for response size
        sourceType: r.sourceType,
        authorName: r.authorName,
        tags: r.tags,
        similarity: Math.round(r.similarity * 100) / 100,
      })),
    });
  } catch (err) {
    console.error("[GET /api/knowledge/search]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
