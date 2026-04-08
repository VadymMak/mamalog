import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

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

/**
 * Create a 1536-dimension embedding vector for text using
 * OpenAI text-embedding-3-small.
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

/**
 * Search knowledge base using pgvector cosine similarity.
 * Results are ordered by trustIndex DESC first, then cosine similarity.
 * Only returns approved (verified) entries.
 */
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
      id,
      title,
      content,
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
