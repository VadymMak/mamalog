import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

// ─── Shared types ─────────────────────────────────────────────────────────────

/** Full result returned from searchKnowledge (legacy, kept for compat) */
export interface KnowledgeResult {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  authorName: string | null;
  authorRole: string | null;
  tags: string[];
  ageGroup: string | null;
  trustIndex: number;
  similarity: number;
}

/** Normalised chunk used by vector/keyword search and buildKnowledgeContext */
export interface KnowledgeChunk {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  trustIndex: number;
  tags: string[];
}

/** Minimal diary entry shape consumed by buildKnowledgeContext */
export interface DiaryEntry {
  createdAt: Date | null;
  moodScore: number;
  notes: string | null;
}

// ─── Embedding helpers ────────────────────────────────────────────────────────

/**
 * Create a 1536-dimension embedding vector using OpenAI text-embedding-3-small.
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.trim().slice(0, 8000),
  });
  const embedding = response.data[0]?.embedding;
  if (!embedding) throw new Error("No embedding returned from OpenAI");
  return embedding;
}

// ─── 1. Vector search — semantic similarity ───────────────────────────────────

export async function vectorSearch(
  query: string,
  limit = 3
): Promise<KnowledgeChunk[]> {
  const embedding = await createEmbedding(query);
  const vectorLiteral = `[${embedding.join(",")}]`;

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      content: string;
      source_type: string;
      trust_index: number;
      tags: string[];
    }>
  >(
    `
    SELECT
      id,
      title,
      content,
      "sourceType" AS source_type,
      "trustIndex" AS trust_index,
      tags,
      1 - (embedding <=> $1::vector) AS similarity
    FROM "KnowledgeBase"
    WHERE embedding IS NOT NULL
      AND (status = 'approved' OR verified = true)
    ORDER BY "trustIndex" DESC, embedding <=> $1::vector
    LIMIT $2
    `,
    vectorLiteral,
    limit
  );

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    sourceType: r.source_type,
    trustIndex: Number(r.trust_index),
    tags: r.tags,
  }));
}

// ─── 2. Keyword search — exact / partial match ────────────────────────────────

export async function keywordSearch(
  query: string,
  limit = 3
): Promise<KnowledgeChunk[]> {
  const words = query
    .toLowerCase()
    .split(" ")
    .filter((w) => w.length > 3);

  const rows = await prisma.knowledgeBase.findMany({
    where: {
      AND: [
        { OR: [{ status: "approved" }, { verified: true }] },
        {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
            ...(words.length > 0 ? [{ tags: { hasSome: words } }] : []),
          ],
        },
      ],
    },
    select: {
      id: true,
      title: true,
      content: true,
      sourceType: true,
      trustIndex: true,
      tags: true,
    },
    orderBy: { trustIndex: "desc" },
    take: limit,
  });

  return rows;
}

// ─── 3. Build compact context — max ~800 tokens ───────────────────────────────

export function buildKnowledgeContext(
  vectorResults: KnowledgeChunk[],
  keywordResults: KnowledgeChunk[],
  diaryEntries: DiaryEntry[]
): string {
  const seen = new Set<string>();
  const chunks: string[] = [];

  const SOURCE_LABEL: Record<string, string> = {
    admin: "Администратор",
    specialist: "Специалист",
    mom: "Опыт мамы",
  };

  // Deduplicate, prefer vector results, cap at 4
  const allResults = [...vectorResults, ...keywordResults].filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  }).slice(0, 4);

  if (allResults.length > 0) {
    chunks.push("📚 Из базы знаний:");
    for (const r of allResults) {
      const snippet = r.content.slice(0, 200);
      const stars = "⭐".repeat(r.trustIndex > 0 ? r.trustIndex : 3);
      const source = SOURCE_LABEL[r.sourceType] ?? r.sourceType;
      chunks.push(`[${r.title}] ${snippet}... | ${source} ${stars}`);
    }
  }

  if (diaryEntries.length > 0) {
    chunks.push("\n📓 Последние записи дневника:");
    for (const e of diaryEntries.slice(0, 3)) {
      const date = e.createdAt?.toLocaleDateString("ru") ?? "—";
      const note = (e.notes ?? "").slice(0, 100);
      chunks.push(`${date}: настроение ${e.moodScore}/10. ${note}`);
    }
  }

  return chunks.join("\n");
}

// ─── Legacy: searchKnowledge (kept for compatibility) ────────────────────────

export async function searchKnowledge(
  query: string,
  limit = 5
): Promise<KnowledgeResult[]> {
  const queryEmbedding = await createEmbedding(query);
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      content: string;
      source_type: string;
      author_name: string | null;
      author_role: string | null;
      tags: string[];
      age_group: string | null;
      trust_index: number;
      similarity: number;
    }>
  >(
    `
    SELECT
      id, title, content,
      "sourceType"   AS source_type,
      "authorName"   AS author_name,
      "authorRole"   AS author_role,
      tags,
      "ageGroup"     AS age_group,
      "trustIndex"   AS trust_index,
      1 - (embedding <=> $1::vector) AS similarity
    FROM "KnowledgeBase"
    WHERE embedding IS NOT NULL
      AND (status = 'approved' OR verified = true)
    ORDER BY "trustIndex" DESC, embedding <=> $1::vector
    LIMIT $2
    `,
    vectorLiteral,
    limit
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    sourceType: row.source_type,
    authorName: row.author_name,
    authorRole: row.author_role,
    tags: row.tags,
    ageGroup: row.age_group,
    trustIndex: Number(row.trust_index),
    similarity: Number(row.similarity),
  }));
}
