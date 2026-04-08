import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

export interface KnowledgeResult {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  authorName: string | null;
  tags: string[];
  similarity: number;
}

/**
 * Create a 1536-dimension embedding vector for text using
 * OpenAI text-embedding-3-small.
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.trim().slice(0, 8000), // model token limit safety
  });
  const embedding = response.data[0]?.embedding;
  if (!embedding) throw new Error("No embedding returned from OpenAI");
  return embedding;
}

/**
 * Search knowledge base using pgvector cosine similarity.
 * Returns top N entries most semantically similar to the query.
 */
export async function searchKnowledge(
  query: string,
  limit = 5
): Promise<KnowledgeResult[]> {
  const queryEmbedding = await createEmbedding(query);
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  // pgvector cosine distance operator: <=>
  // 1 - cosine_distance = cosine_similarity
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      content: string;
      source_type: string;
      author_name: string | null;
      tags: string[];
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
      tags,
      1 - (embedding <=> $1::vector) AS similarity
    FROM "KnowledgeBase"
    WHERE embedding IS NOT NULL
      AND verified = true
    ORDER BY embedding <=> $1::vector
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
    tags: row.tags,
    similarity: Number(row.similarity),
  }));
}
