import { NextRequest, NextResponse } from "next/server";
import { APIError } from "openai";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { getRequiredSession, getUserId } from "@/lib/session";
import { validateMessage } from "@/lib/validations";
import { buildSystemPrompt } from "@/lib/ai";
import { vectorSearch, keywordSearch, buildKnowledgeContext } from "@/lib/embeddings";

interface MessageContext {
  childAge?: number;
  diagnosis?: string;
}

interface RequestBody {
  message: string;
  language?: string;
  context?: MessageContext;
}

const TODAY_START = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const FREE_DAILY_LIMIT = 3;
const PREMIUM_DAILY_LIMIT = 20;
const MODEL = "gpt-4o-mini";

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

    // Fetch user subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscription: { select: { plan: true, status: true } },
      },
    });

    const subscriptionPlan = user?.subscription?.plan ?? "FREE";
    const subscriptionActive = user?.subscription?.status === "active";

    const isPremium =
      subscriptionActive &&
      (subscriptionPlan === "MONTHLY" || subscriptionPlan === "YEARLY");

    const dailyLimit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;

    // Enforce daily limit for all users
    // NOTE: AIUsageLog table not yet in prod DB — skip rate limiting until migration runs
    try {
      const todayCount = await prisma.aIUsageLog.count({
        where: { userId, createdAt: { gte: TODAY_START() } },
      });
      if (todayCount >= dailyLimit) {
        const limitMsg = isPremium
          ? `Premium plan limit reached (${PREMIUM_DAILY_LIMIT} messages/day). Try again tomorrow.`
          : `Free plan limit reached (${FREE_DAILY_LIMIT} messages/day). Upgrade to Premium for ${PREMIUM_DAILY_LIMIT} messages/day.`;
        return NextResponse.json(
          { success: false, error: limitMsg, limitReached: true, isPremium },
          { status: 429 }
        );
      }
    } catch {
      // AIUsageLog table missing in DB — skip until migration runs
    }

    // Run all context fetches in parallel — vector search, keyword search, diary
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

    // Build compact context (~800 tokens max)
    const knowledgeContext = buildKnowledgeContext(
      vectorResults,
      keywordResults,
      diaryEntries
    );

    const systemPrompt = buildSystemPrompt(language, knowledgeContext || undefined);

    // Append optional context hints
    const contextHints: string[] = [];
    if (context?.childAge !== undefined)
      contextHints.push(`Child's age: ${context.childAge}`);
    if (context?.diagnosis)
      contextHints.push(`Diagnosis: ${context.diagnosis}`);

    const userContent =
      contextHints.length > 0
        ? `${message}\n\n[Additional context: ${contextHints.join(", ")}]`
        : message;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    const tokensUsed = completion.usage?.total_tokens ?? 0;

    // Log usage for rate limiting (best-effort — table may not exist yet)
    try {
      await prisma.aIUsageLog.create({ data: { userId } });
    } catch {
      // AIUsageLog table missing in DB — skip until migration runs
    }

    return NextResponse.json({
      success: true,
      data: { reply, language, tokensUsed, model: MODEL, isPremium },
    });
  } catch (err) {
    if (err instanceof APIError) {
      if (err.status === 429) {
        console.error("[POST /api/ai/chat] OpenAI quota exceeded:", err.message);
        return NextResponse.json(
          { success: false, error: "AI service is temporarily unavailable. Please try again later." },
          { status: 429 }
        );
      }
      if (err.status === 401) {
        console.error("[POST /api/ai/chat] OpenAI auth error:", err.message);
        return NextResponse.json(
          { success: false, error: "Internal server error" },
          { status: 500 }
        );
      }
      if (err.status === 408 || err.code === "ETIMEDOUT") {
        console.error("[POST /api/ai/chat] OpenAI timeout:", err.message);
        return NextResponse.json(
          { success: false, error: "AI service timed out. Please try again." },
          { status: 504 }
        );
      }
    }

    console.error("[POST /api/ai/chat] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
