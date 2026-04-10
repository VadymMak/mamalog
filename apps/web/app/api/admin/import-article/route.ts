import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey, adminAuthResponse } from "@/lib/adminAuth";

function extractFromHtml(html: string): { title: string; text: string } {
  // Extract title
  const titleMatch =
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ||
    "Без названия";
  const title = titleMatch.replace(/<[^>]+>/g, "").trim();

  // Remove scripts, styles, nav, footer, header
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Try to extract main content block
  const articleMatch =
    cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ||
    cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ||
    cleaned;

  // Strip remaining tags
  const text = articleMatch
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);

  return { title, text };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = checkAdminKey(req);
  if (!auth.ok) return adminAuthResponse(auth);

  const { url, category } = await req.json() as { url: string; category?: string };

  if (!url?.trim()) {
    return NextResponse.json({ success: false, error: "URL обязателен" }, { status: 400 });
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ success: false, error: "Некорректный URL" }, { status: 400 });
  }

  // 1. Fetch page
  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Mamalog-Admin/1.0)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `Не удалось загрузить страницу: ${err instanceof Error ? err.message : String(err)}` },
      { status: 422 }
    );
  }

  // 2. Extract content
  const { title, text } = extractFromHtml(html);

  if (text.length < 100) {
    return NextResponse.json(
      { success: false, error: "Не удалось извлечь текст со страницы. Попробуйте другой URL." },
      { status: 422 }
    );
  }

  // 3. Claude — clean and convert to Markdown
  let markdownContent: string;
  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `Преобразуй текст статьи в чистый Markdown формат для мам детей с РАС/СДВГ.
Сохрани основной контент, убери навигацию/рекламу/подвал.
Добавь ## заголовки и маркированные списки там где нужно.
Ответь ТОЛЬКО Markdown содержимым, без объяснений и вводных фраз.

Заголовок: ${title}
Контент: ${text}`,
          },
        ],
      }),
    });

    if (!claudeRes.ok) throw new Error(`Claude API ${claudeRes.status}`);
    const claudeData = await claudeRes.json() as { content?: Array<{ text: string }> };
    markdownContent = claudeData.content?.[0]?.text ?? text;
  } catch {
    // Fallback: use raw extracted text
    markdownContent = text;
  }

  // 4. Save to KnowledgeBase
  const article = await prisma.knowledgeBase.create({
    data: {
      title: title.slice(0, 200),
      content: markdownContent,
      sourceType: "admin",
      authorName: parsedUrl.hostname,
      authorRole: "imported",
      tags: category ? [category] : [],
      status: "approved",
      verified: true,
      trustIndex: 4,
      aiScore: 85,
      aiReason: `Импортировано с ${parsedUrl.hostname} и отформатировано Claude`,
    },
  });

  return NextResponse.json({ success: true, id: article.id, title: article.title });
}
