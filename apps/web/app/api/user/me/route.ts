import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredSession, getUserId } from "@/lib/session";

// Lightweight endpoint used by mobile to re-check SuperUser status.
// Returns flat object so mobile can check: res.data?.isSuperUser === true
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      isSuperUser: true,
      subscription: { select: { plan: true, status: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    isSuperUser: user.isSuperUser ?? false,
    subscriptionPlan: user.subscription?.plan ?? "FREE",
    subscriptionActive: user.subscription?.status === "active",
  });
}
