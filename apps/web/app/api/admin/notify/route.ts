import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey, adminAuthResponse } from "@/lib/adminAuth";
import { sendExpoPush } from "@/lib/push";

// POST /api/admin/notify — broadcast push notification to users
// Body: { title, body, segment: "all" | "free" | "premium" }
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = checkAdminKey(req);
  if (!auth.ok) return adminAuthResponse(auth);

  try {
    const { title, body, segment = "all" } = await req.json() as {
      title: string;
      body: string;
      segment?: "all" | "free" | "premium";
    };

    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ success: false, error: "title and body are required" }, { status: 400 });
    }

    // Build where clause based on segment
    const where: Record<string, unknown> = { pushToken: { not: null } };

    if (segment === "premium") {
      where.subscription = { status: "active", plan: { in: ["MONTHLY", "YEARLY"] } };
    } else if (segment === "free") {
      where.OR = [
        { subscription: null },
        { subscription: { plan: "FREE" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: { pushToken: true },
    });

    const tokens = users.map((u) => u.pushToken).filter(Boolean) as string[];

    await sendExpoPush(tokens, { title: title.trim(), body: body.trim() });

    return NextResponse.json({ success: true, data: { sent: tokens.length } });
  } catch (err) {
    console.error("[POST /api/admin/notify]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
