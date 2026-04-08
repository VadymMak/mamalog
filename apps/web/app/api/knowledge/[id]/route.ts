import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey, adminAuthResponse } from "@/lib/adminAuth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface PatchBody {
  status?: "approved" | "rejected" | "pending";
  trustIndex?: number;
  title?: string;
  content?: string;
  tags?: string[];
  ageGroup?: string;
  authorRole?: string;
}

// ─── PATCH /api/knowledge/[id] ────────────────────────────────────────────────
// Admin only — approve / reject / update metadata

export async function PATCH(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = checkAdminKey(req);
  if (!auth.ok) return adminAuthResponse(auth);

  const { id } = await params;

  try {
    const body: PatchBody = await req.json();
    const { status, trustIndex, title, content, tags, ageGroup, authorRole } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (status !== undefined) {
      updateData.status = status;
      updateData.verified = status === "approved";
    }
    if (trustIndex !== undefined) updateData.trustIndex = Math.min(5, Math.max(1, trustIndex));
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (tags !== undefined) updateData.tags = tags;
    if (ageGroup !== undefined) updateData.ageGroup = ageGroup;
    if (authorRole !== undefined) updateData.authorRole = authorRole;

    const updated = await prisma.knowledgeBase.update({
      where: { id },
      data: updateData,
      select: { id: true, status: true, trustIndex: true, title: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ success: false, error: "Article not found" }, { status: 404 });
    }
    console.error("[PATCH /api/knowledge/[id]]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE /api/knowledge/[id] ───────────────────────────────────────────────
// Admin only

export async function DELETE(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = checkAdminKey(req);
  if (!auth.ok) return adminAuthResponse(auth);

  const { id } = await params;

  try {
    await prisma.knowledgeBase.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ success: false, error: "Article not found" }, { status: 404 });
    }
    console.error("[DELETE /api/knowledge/[id]]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
