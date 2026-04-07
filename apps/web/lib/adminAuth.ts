import { NextRequest, NextResponse } from "next/server";

export type AdminAuthOk = { ok: true };
export type AdminAuthFail = { ok: false; response: NextResponse };
export type AdminAuthResult = AdminAuthOk | AdminAuthFail;

export function checkAdminKey(req: NextRequest): AdminAuthResult {
  const key = req.headers.get("x-admin-key");
  const secret = process.env.ADMIN_SECRET_KEY;

  if (!secret || key !== secret) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 401 }
      ),
    };
  }

  return { ok: true };
}

/** Type-safe helper — use when TypeScript fails to narrow the union */
export function adminAuthResponse(auth: AdminAuthResult): NextResponse {
  return (auth as AdminAuthFail).response;
}
