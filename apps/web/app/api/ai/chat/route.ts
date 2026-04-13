import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getRequiredSession, getUserId } from "@/lib/session";
import { validateMessage } from "@/lib/validations";
import { buildSystemPrompt } from "@/lib/ai";
import { vectorSearch, keywordSearch, buildKnowledgeContext } from "@/lib/embeddings";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TODAY_START = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

interface MessageContext {
  childAge?: number;
  diagnosis?: string;
}

interface RequestBody {
  message: string;
  language?: string;
  context?: MessageContext;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const body: RequestBody = await req.json();
    const { message, language = "ru", context } = body;

    if (!message || !validateMessage(message)) {
      return NextResponse.json(
        { success: false, error: "Message must be between 1 and 1000 characters" },
        { status: 400 }
      );
    }

    // ── Determine user tier ────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isSuperUser: true,
        subscription: { select: { plan: true, status: true } },
      },
    });

    const isSuperUser = user?.isSuperUser ?? false;
    const subscriptionPlan = user?.subscription?.plan ?? "FREE";
    const subscriptionActive = user?.subscription?.status === "active";
    const isPro =
      subscriptionActive &&
      (subscriptionPlan === "MONTHLY" || subscriptionPlan === "YEARLY");

    const dailyLimit = isSuperUser ? 999999 : isPro ? 40 : 3;

    // ── Daily limit check (skip for superUser) ─────────────────────────────────
    const usageCount = await prisma.aIUsageLog
      .count({ where: { userId, createdAt: { gte: TODAY_START() } } })
      .catch(() => 0);

    if (!isSuperUser && usageCount >= dailyLimit) {
      return NextResponse.json(
        {
          success: false,
          error: `Лимит ${dailyLimit} сообщений в день исчерпан`,
          limitReached: true,
          limit: dailyLimit,
          used: usageCount,
        },
        { status: 429 }
      );
    }

    // ── Build context (vector + keyword + diary) ───────────────────────────────
    const [vectorResults, keywordResults, diaryEntries] = await Promise.all([
      vectorSearch(message, 3).catch(() => []),
      keywordSearch(message, 3).catch(() => []),
      prisma.logEntry.findMany({
        where: { userId },
        select: { createdAt: true, moodScore: true, notes: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ]);

    const knowledgeContext = buildKnowledgeContext(
      vectorResults,
      keywordResults,
      diaryEntries
    );

    const systemPrompt = buildSystemPrompt(language, knowledgeContext || undefined);

    const contextHints: string[] = [];
    if (context?.childAge !== undefined)
      contextHints.push(`Child's age: ${context.childAge}`);
    if (context?.diagnosis)
      contextHints.push(`Diagnosis: ${context.diagnosis}`);

    const userContent =
      contextHints.length > 0
        ? `${message}\n\n[Additional context: ${contextHints.join(", ")}]`
        : message;

    // ── Call AI based on tier ──────────────────────────────────────────────────
    let reply = "";
    let tokensUsed = 0;
    let modelUsed = "";

    if (isSuperUser) {
      // SuperUser → Claude Opus (unlimited)
      const response = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      });
      reply = response.content[0]?.type === "text" ? response.content[0].text : "";
      tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
      modelUsed = "claude-opus-4-6";
    } else {
      // FREE / PRO → OpenAI gpt-4o-mini
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 1000,
      });
      reply = response.choices[0]?.message?.content ?? "";
      tokensUsed = response.usage?.total_tokens ?? 0;
      modelUsed = "gpt-4o-mini";
    }

    // ── Log usage (skip for SuperUser, best-effort) ───────────────────────────
    if (!isSuperUser) {
      await prisma.aIUsageLog
        .create({ data: { id: crypto.randomUUID(), userId } })
        .catch(() => {});
    }

    // ── Tiered response ───────────────────────────────────────────────────────
    const baseData = { reply, language, tokensUsed, model: modelUsed };

    if (isSuperUser) {
      return NextResponse.json({
        success: true,
        data: { ...baseData, isSuperUser: true, showCounter: false },
      });
    }

    if (isPro) {
      return NextResponse.json({
        success: true,
        data: { ...baseData, showCounter: false },
      });
    }

    // FREE
    return NextResponse.json({
      success: true,
      data: { ...baseData, used: usageCount + 1, limit: 3, showCounter: true },
    });
  } catch (err) {
    console.error("[POST /api/ai/chat] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
