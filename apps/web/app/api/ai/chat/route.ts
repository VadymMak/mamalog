import { NextRequest, NextResponse } from "next/server";
import { APIError } from "openai";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { getRequiredSession, getUserId } from "@/lib/session";
import { validateMessage } from "@/lib/validations";
import { buildSystemPrompt, formatLogsForAI } from "@/lib/ai";

interface MessageContext {
  recentLogs?: string[];
  childAge?: number;
  diagnosis?: string;
}

interface RequestBody {
  message: string;
  language?: string;
  context?: MessageContext;
}

const SEVEN_DAYS_AGO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const body: RequestBody = await req.json();
    const { message, language = "ru", context } = body;

    // Validate message
    if (!message || !validateMessage(message)) {
      return NextResponse.json(
        { success: false, error: "Message must be between 1 and 1000 characters" },
        { status: 400 }
      );
    }

    // Fetch last 7 days of logs for AI context
    const recentLogs = await prisma.logEntry.findMany({
      where: {
        userId,
        date: { gte: SEVEN_DAYS_AGO() },
      },
      include: { behaviors: true },
      orderBy: { date: "desc" },
      take: 14,
    });

    const logsContext = formatLogsForAI(recentLogs);
    const systemPrompt = buildSystemPrompt(language, logsContext);

    // Append optional context hints to user message
    const contextHints: string[] = [];
    if (context?.childAge !== undefined) {
      contextHints.push(`Child's age: ${context.childAge}`);
    }
    if (context?.diagnosis) {
      contextHints.push(`Diagnosis: ${context.diagnosis}`);
    }

    const userContent =
      contextHints.length > 0
        ? `${message}\n\n[Additional context: ${contextHints.join(", ")}]`
        : message;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    const tokensUsed = completion.usage?.total_tokens ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        reply,
        language,
        tokensUsed,
      },
    });
  } catch (err) {
    // OpenAI-specific error handling
    if (err instanceof APIError) {
      if (err.status === 429) {
        console.error("[POST /api/ai/chat] OpenAI quota exceeded:", err.message);
        return NextResponse.json(
          {
            success: false,
            error:
              "AI service is temporarily unavailable due to high demand. Please try again later.",
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
