import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { password } = await req.json();
    const secret = process.env.ADMIN_SECRET_KEY;

    if (!secret || password !== secret) {
      return NextResponse.json(
        { success: false, error: "Неверный пароль" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ success: true, token: secret });
    res.cookies.set("adminToken", secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json(
      { success: false, error: "Bad request" },
      { status: 400 }
    );
  }
}
