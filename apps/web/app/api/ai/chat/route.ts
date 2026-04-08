import { NextRequest, NextResponse } from "next/server";
import { APIError } from "openai";
import Anthropic from "@anthropic-ai/sdk";
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

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

    // Fetch user + subscription in one query
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isSuperUser: true,
        subscription: { select: { plan: true, status: true } },
      },
    });

    const subscriptionPlan = user?.subscription?.plan ?? "FREE";
    const subscriptionActive = user?.subscription?.status === "active";
    const isSuperUser = user?.isSuperUser ?? false;

    const isPremium =
      isSuperUser ||
      (subscriptionActive &&
        (subscriptionPlan === "MONTHLY" || subscriptionPlan === "YEARLY"));

    // Enforce FREE daily limit
    if (!isPremium) {
      const todayCount = await prisma.aIUsageLog.count({
        where: { userId, createdAt: { gte: TODAY_START() } },
      });
      if (todayCount >= FREE_DAILY_LIMIT) {
        return NextResponse.json(
          {
            success: false,
            error: `Free plan limit reached (${FREE_DAILY_LIMIT} messages/day). Upgrade to Premium for unlimited access.`,
            limitReached: true,
          },
          { status: 429 }
        );
      }
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

    let reply: string;
    let tokensUsed = 0;
    let model: string;

    if (isPremium) {
      // Premium: Claude Sonnet with full hybrid RAG
      model = "claude-sonnet-4-6";
      const response = await anthropic.messages.create({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      });
      const block = response.content[0];
      reply = block.type === "text" ? block.text : "";
      tokensUsed =
        (response.usage.input_tokens ?? 0) + (response.usage.output_tokens ?? 0);
    } else {
      // Free: GPT-4o-mini with same compact context
      model = "gpt-4o-mini";
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 800,
        temperature: 0.7,
      });
      reply = completion.choices[0]?.message?.content ?? "";
      tokensUsed = completion.usage?.total_tokens ?? 0;
    }

    // Log usage for rate limiting
    await prisma.aIUsageLog.create({ data: { userId } });

    return NextResponse.json({
      success: true,
      data: { reply, language, tokensUsed, model, isPremium },
    });
  } catch (err) {
    if (err instanceof APIError) {
      if (err.status === 429) {
        console.error("[POST /api/ai/chat] OpenAI quota exceeded:", err.message);
        return NextResponse.json(
          {
            success: false,
            error:
              "AI service is temporarily unavailable. Please try again later.",
          },
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
