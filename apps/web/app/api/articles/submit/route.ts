import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredSession, getUserId } from "@/lib/session";

interface ModerationResult {
  score: number;
  isRelevant: boolean;
  isSpam: boolean;
  reason: string;
  suggestion: string | null;
}

async function moderateWithClaude(title: string, content: string): Promise<ModerationResult> {
  const prompt = `
You are a content moderator for Mamalog — an app for mothers of children with ASD, ADHD, developmental delays.

Analyze this article and respond ONLY with JSON (no markdown, no explanation outside JSON):
{
  "score": 0-100,
  "isRelevant": true/false,
  "isSpam": true/false,
  "reason": "brief explanation in Russian",
  "suggestion": "improvement tip in Russian or null"
}

Score guide:
- 80-100: Relevant, helpful, publish automatically
- 40-79: Needs human review
- 0-39: Spam or irrelevant, reject automatically

Article title: ${title}
Article content: ${content.slice(0, 2000)}
`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error("Claude API error");

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "{}";

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Claude response");

  return JSON.parse(jsonMatch[0]) as ModerationResult;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const { title, content, category, authorName } = await req.json();

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: "Заголовок и содержание обязательны" },
        { status: 400 }
      );
    }

    // AI moderation
    let moderation: ModerationResult;
    try {
      moderation = await moderateWithClaude(title, content);
    } catch {
      // Fallback to pending if Claude fails
      moderation = { score: 50, isRelevant: true, isSpam: false, reason: "Ручная проверка", suggestion: null };
    }

    const status =
      moderation.score >= 80 ? "approved" :
      moderation.score >= 40 ? "pending" : "rejected";

    await prisma.knowledgeBase.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        sourceType: "mom",
        authorName: authorName?.trim() || null,
        authorRole: "mom",
        authorId: userId,
        tags: category ? [category] : [],
        status,
        verified: status === "approved",
        trustIndex: Math.round(moderation.score / 20),
        aiScore: moderation.score,
        aiReason: moderation.reason,
      },
    });

    if (status === "approved") {
      return NextResponse.json({
        success: true,
        status: "approved",
        message: "Статья опубликована!",
      });
    }
    if (status === "pending") {
      return NextResponse.json({
        success: true,
        status: "pending",
        message: "Статья отправлена на проверку модератору",
      });
    }
    return NextResponse.json({
      success: false,
      status: "rejected",
      message: "Статья не прошла модерацию",
      reason: moderation.reason,
    });
  } catch (err) {
    console.error("[POST /api/articles/submit]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
