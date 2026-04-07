import { NextRequest, NextResponse } from "next/server";

type AdminAuthOk = { ok: true };
type AdminAuthFail = { ok: false; response: NextResponse };
type AdminAuthResult = AdminAuthOk | AdminAuthFail;

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
