import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getAdminKey(req: NextRequest): string | null {
  return req.headers.get("x-admin-key");
}

function isAuthorized(req: NextRequest): boolean {
  const key = getAdminKey(req);
  return key !== null && key === process.env.ADMIN_SECRET_KEY;
}

// GET /api/admin/moderation — list pending articles
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";

  const items = await prisma.knowledgeBase.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      content: true,
      sourceType: true,
      authorName: true,
      authorRole: true,
      tags: true,
      status: true,
      aiScore: true,
      aiReason: true,
      trustIndex: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: items });
}

// PATCH /api/admin/moderation — approve or reject an article
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, action } = await req.json() as { id: string; action: "approve" | "reject" };

  if (!id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const updated = await prisma.knowledgeBase.update({
    where: { id },
    data: {
      status: action === "approve" ? "approved" : "rejected",
      verified: action === "approve",
    },
  });

  return NextResponse.json({ success: true, status: updated.status });
}
