import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const article = await prisma.knowledgeBase.findFirst({
    where: { id, status: "approved" },
    select: {
      id: true,
      title: true,
      content: true,
      sourceType: true,
      authorName: true,
      authorRole: true,
      tags: true,
      ageGroup: true,
      trustIndex: true,
      createdAt: true,
    },
  });

  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: article });
}
