import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey, adminAuthResponse } from "@/lib/adminAuth";
import { createEmbedding } from "@/lib/embeddings";

interface PostBody {
  title: string;
  content: string;
  sourceType: string;
  authorName?: string;
  authorId?: string;
  tags?: string[];
  verified?: boolean;
}

// ─── POST /api/knowledge (admin only) ────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = checkAdminKey(req);
  if (!auth.ok) return adminAuthResponse(auth);

  try {
    const body: PostBody = await req.json();
    const { title, content, sourceType, authorName, authorId, tags = [], verified = true } = body;

    if (!title?.trim() || !content?.trim() || !sourceType?.trim()) {
      return NextResponse.json(
        { success: false, error: "title, content and sourceType are required" },
        { status: 400 }
      );
    }

    // Generate embedding
    const embeddingVector = await createEmbedding(`${title}\n\n${content}`);
    const vectorLiteral = `[${embeddingVector.join(",")}]`;

    // Insert with raw SQL to write the vector column
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
      INSERT INTO "KnowledgeBase"
        (id, title, content, embedding, "sourceType", verified, "authorId", "authorName", tags, "createdAt", "updatedAt")
      VALUES
        (gen_random_uuid()::text, $1, $2, $3::vector, $4, $5, $6, $7, $8, now(), now())
      RETURNING id
      `,
      title.trim(),
      content.trim(),
      vectorLiteral,
      sourceType.trim(),
      verified,
      authorId ?? null,
      authorName ?? null,
      tags
    );

    const id = rows[0]?.id;
    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/knowledge]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
