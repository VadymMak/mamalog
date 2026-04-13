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
  if (authHeader?.startsWith("Bearer ")) {
    const raw = authHeader.replace("Bearer ", "").replace(/"/g, "").trim();
    console.error("[session] Bearer raw userId:", raw);
    if (raw) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: raw },
          // Explicit select avoids SELECT * which breaks if schema columns
          // (e.g. isSuperUser) haven't been migrated to the DB yet.
          select: { id: true, email: true, name: true, language: true },
        });
        if (user) {
          const mobileSession = {
            user: { id: user.id, email: user.email, name: user.name },
            expires: new Date(Date.now() + 86400_000 * 30).toISOString(),
          } as Session;
          return { ok: true, session: mobileSession };
        }
        console.error("[session] No user found for id:", raw);
      } catch (err) {
        console.error("[session] Prisma error:", err);
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
