import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredSession, getUserId } from "@/lib/session";

// POST /api/user/push-token — save Expo push token for authenticated user
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const { token } = await req.json() as { token?: string };

    if (!token || typeof token !== "string") {
      return NextResponse.json({ success: false, error: "token is required" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { pushToken: token },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/user/push-token]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
