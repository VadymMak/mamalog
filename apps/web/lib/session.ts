import { getServerSession, Session } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

type SessionOk = { ok: true; session: Session };
type SessionFail = { ok: false; response: NextResponse };
type SessionResult = SessionOk | SessionFail;

export async function getRequiredSession(): Promise<SessionResult> {
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
