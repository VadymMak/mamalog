import { getServerSession, Session } from "next-auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionOk = { ok: true; session: Session; response?: undefined };
type SessionFail = { ok: false; response: NextResponse; session?: undefined };
type SessionResult = SessionOk | SessionFail;

export async function getRequiredSession(): Promise<SessionResult> {
  // 1. Try Bearer token from mobile (Authorization: Bearer {userId})
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  console.log("[session] AUTH HEADER:", authHeader);
  if (authHeader?.startsWith("Bearer ")) {
    const userId = authHeader.replace("Bearer ", "").replace(/"/g, "").trim();
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      console.log("[session] USER FOUND:", user?.id ?? "null");
      if (user) {
        const mobileSession = {
          user: { id: user.id, email: user.email, name: user.name },
          expires: new Date(Date.now() + 86400_000).toISOString(),
        } as Session;
        return { ok: true, session: mobileSession };
      }
    }
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  // 2. Fall back to NextAuth session cookie (web)
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return { ok: true, session };
}

export function getUserId(session: Session): string {
  return session.user.id;
}
