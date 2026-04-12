import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredSession, getUserId } from "@/lib/session";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostBody {
  month: number; // 1-12
  year: number;
}

interface InsightItem {
  type: "positive" | "warning" | "neutral";
  icon: string;
  title: string;
  text: string;
  confidence: number;
}

interface AnalysisResult {
  hasInsights: boolean;
  insights?: InsightItem[];
  recommendation?: string;
  message?: string;
}

// ─── POST /api/lessons/analyze ────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const body: PostBody = await req.json();
    const { month, year } = body;

    if (
      !month ||
      !year ||
      typeof month !== "number" ||
      typeof year !== "number" ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        { success: false, error: "month (1–12) and year are required" },
        { status: 400 }
      );
    }

    // ── Date range for the month ───────────────────────────────────────────
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // last day of month
    const startStr = startDate.toISOString().split("T")[0]!;
    const endStr = endDate.toISOString().split("T")[0]!;

    // ── Fetch data ─────────────────────────────────────────────────────────
    const [lessons, behaviors, logEntries] = await Promise.all([
      prisma.lesson.findMany({
        where: {
          userId,
          date: { gte: startStr, lte: endStr },
        },
        orderBy: { date: "asc" },
      }),
      prisma.behaviorLog.findMany({
        where: {
          logEntry: { userId },
          createdAt: { gte: startDate, lte: new Date(endDate.getTime() + 86399999) },
        },
        include: { logEntry: { select: { date: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.logEntry.findMany({
        where: {
          userId,
          date: { gte: startDate, lte: new Date(endDate.getTime() + 86399999) },
        },
        orderBy: { date: "asc" },
      }),
    ]);

    // ── Minimum data check ─────────────────────────────────────────────────
    if (lessons.length < 3) {
      return NextResponse.json({
        hasInsights: false,
        message: "Добавьте минимум 3 занятия для AI-анализа",
      });
    }

    // ── Build context for Claude ───────────────────────────────────────────
    const context = `
Данные за ${month}/${year}:

ЗАНЯТИЯ (${lessons.length}):
${lessons
  .map(
    (l) =>
      `- ${l.date} ${l.startTime}: ${l.title} (${l.type}), оценка: ${l.rating ?? "нет"}`
  )
  .join("\n")}

ПОВЕДЕНИЕ (${behaviors.length} эпизодов):
${
  behaviors.length > 0
    ? behaviors
        .map(
          (b) =>
            `- ${b.createdAt.toISOString().split("T")[0]}: ${b.category}, интенсивность: ${b.intensity ?? "?"}`
        )
        .join("\n")
    : "Нет эпизодов"
}

НАСТРОЕНИЕ ПО ДНЯМ:
${
  logEntries.length > 0
    ? logEntries
        .map(
          (l) =>
            `- ${l.date instanceof Date ? l.date.toISOString().split("T")[0] : String(l.date).split("T")[0]}: настроение ${l.moodScore}/10`
        )
        .join("\n")
    : "Нет записей"
}
`.trim();

    // ── Call Claude ────────────────────────────────────────────────────────
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: `Ты AI-помощник для мам особенных детей (РАС, СДВГ).
Проанализируй данные и найди паттерны связи между занятиями и поведением/настроением ребёнка.

${context}

Ответь ТОЛЬКО в JSON формате без markdown:
{
  "hasInsights": true,
  "insights": [
    {
      "type": "positive" | "warning" | "neutral",
      "icon": "emoji",
      "title": "краткий заголовок (до 6 слов)",
      "text": "подробное наблюдение (1-2 предложения)",
      "confidence": 60-95
    }
  ],
  "recommendation": "одна главная рекомендация маме (1-2 предложения)"
}

Максимум 3 insights. Будь конкретным и supportive. Пиши по-русски.`,
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      console.error("[POST /api/lessons/analyze] Claude API error:", claudeRes.status);
      return NextResponse.json(
        { success: false, error: "AI service unavailable" },
        { status: 502 }
      );
    }

    const claudeData = await claudeRes.json();
    const rawText: string = claudeData.content?.[0]?.text ?? "{}";

    // Extract JSON — Claude sometimes wraps it in markdown
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[POST /api/lessons/analyze] No JSON in Claude response:", rawText);
      return NextResponse.json(
        { success: false, error: "AI returned unexpected format" },
        { status: 502 }
      );
    }

    const result = JSON.parse(jsonMatch[0]) as AnalysisResult;
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/lessons/analyze] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
