import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey, adminAuthResponse } from "@/lib/adminAuth";
import { getRequiredSession, getUserId } from "@/lib/session";
import { createEmbedding } from "@/lib/embeddings";

// ─── Shared types ─────────────────────────────────────────────────────────────

interface PostBody {
  title: string;
  content: string;
  sourceType: string;
  authorName?: string;
  authorId?: string;
  authorRole?: string;
  tags?: string[];
  ageGroup?: string;
  trustIndex?: number;
  status?: string;
}

// ─── GET /api/knowledge ───────────────────────────────────────────────────────
// Public (authenticated): returns approved articles only
// Admin (?admin=true + x-admin-key): returns all articles with any status

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const isAdminRequest = searchParams.get("admin") === "true";

  if (isAdminRequest) {
    const auth = checkAdminKey(req);
    if (!auth.ok) return adminAuthResponse(auth);
  } else {
    const auth = await getRequiredSession();
    if (!auth.ok) return auth.response;
  }

  try {
    const tag = searchParams.get("tag")?.trim();
    const sourceType = searchParams.get("sourceType")?.trim();
    const ageGroup = searchParams.get("ageGroup")?.trim();
    const status = searchParams.get("status")?.trim();
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const where: Record<string, unknown> = {};

    if (!isAdminRequest) {
      // Public: only approved
      where.status = "approved";
    } else if (status) {
      where.status = status;
    }

    if (tag) where.tags = { has: tag };
    if (sourceType) where.sourceType = sourceType;
    if (ageGroup) where.ageGroup = ageGroup;

    const [articles, total] = await prisma.$transaction([
      prisma.knowledgeBase.findMany({
        where,
        select: {
          id: true,
          title: true,
          content: true,
          sourceType: true,
          status: true,
          trustIndex: true,
          authorName: true,
          authorRole: true,
          tags: true,
          ageGroup: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ trustIndex: "desc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
      }),
      prisma.knowledgeBase.count({ where }),
    ]);

    const data = articles.map((a) => ({
      ...a,
      // Truncate content for list view
      excerpt: a.content.slice(0, 300),
    }));

    return NextResponse.json({ success: true, data, total, limit, offset });
  } catch (err) {
    console.error("[GET /api/knowledge]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/knowledge ──────────────────────────────────────────────────────
// Admin: auto-approved with trustIndex
// Authenticated user: pending status, trustIndex 2

export async function POST(req: NextRequest): Promise<NextResponse> {
  const adminAuth = checkAdminKey(req);
  const isAdmin = adminAuth.ok;

  // Non-admin must be authenticated
  if (!isAdmin) {
    const auth = await getRequiredSession();
    if (!auth.ok) return auth.response;
  }

  try {
    const body: PostBody = await req.json();
    const {
      title,
      content,
      sourceType,
      authorName,
      authorId,
      authorRole,
      tags = [],
      ageGroup,
      trustIndex,
      status,
    } = body;

    if (!title?.trim() || !content?.trim() || !sourceType?.trim()) {
      return NextResponse.json(
        { success: false, error: "title, content and sourceType are required" },
        { status: 400 }
      );
    }

    const resolvedTrustIndex = isAdmin ? (trustIndex ?? 4) : 2;
    const resolvedStatus = isAdmin ? (status ?? "approved") : "pending";

    // Generate embedding
    const embeddingVector = await createEmbedding(`${title}\n\n${content}`);
    const vectorLiteral = `[${embeddingVector.join(",")}]`;

    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
      INSERT INTO "KnowledgeBase"
        (id, title, content, embedding, "sourceType", verified, status, "trustIndex",
         "authorId", "authorName", "authorRole", tags, "ageGroup", "createdAt", "updatedAt")
      VALUES
        (gen_random_uuid()::text, $1, $2, $3::vector, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now())
      RETURNING id
      `,
      title.trim(),
      content.trim(),
      vectorLiteral,
      sourceType.trim(),
      resolvedStatus === "approved",   // verified = true when approved
      resolvedStatus,
      resolvedTrustIndex,
      authorId ?? null,
      authorName ?? null,
      authorRole ?? null,
      tags,
      ageGroup ?? null
    );

    const id = rows[0]?.id;
    return NextResponse.json({ success: true, id, status: resolvedStatus }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/knowledge]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
