import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey, adminAuthResponse } from "@/lib/adminAuth";

// GET /api/admin/moderation?status=pending|approved|rejected
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = checkAdminKey(req);
  if (!auth.ok) return adminAuthResponse(auth);

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

// PATCH /api/admin/moderation — approve or reject
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const auth = checkAdminKey(req);
  if (!auth.ok) return adminAuthResponse(auth);

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

// DELETE /api/admin/moderation — delete article
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const auth = checkAdminKey(req);
  if (!auth.ok) return adminAuthResponse(auth);

  const { id } = await req.json() as { id: string };

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await prisma.knowledgeBase.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
