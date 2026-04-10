import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey, adminAuthResponse } from "@/lib/adminAuth";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = checkAdminKey(req);
  if (!auth.ok) return adminAuthResponse(auth);

  try {
    const articles = await prisma.knowledgeBase.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        sourceType: true,
        authorName: true,
        status: true,
        verified: true,
        trustIndex: true,
        tags: true,
        ageGroup: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ success: true, data: articles });
  } catch (err) {
    console.error("[GET /api/admin/publications]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = checkAdminKey(req);
  if (!auth.ok) return adminAuthResponse(auth);

  try {
    const { title, content, category, authorName, isPublished } = await req.json();

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ success: false, error: "title and content are required" }, { status: 400 });
    }

    const article = await prisma.knowledgeBase.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        sourceType: "admin",
        authorName: authorName?.trim() || "Admin",
        authorRole: "admin",
        tags: category ? [category] : [],
        status: isPublished ? "approved" : "pending",
        verified: !!isPublished,
        trustIndex: 5,
      },
    });

    return NextResponse.json({ success: true, data: article }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/publications]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
