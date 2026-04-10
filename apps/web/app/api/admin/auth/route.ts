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

    return NextResponse.json({ success: true, token: secret });
  } catch {
    return NextResponse.json(
      { success: false, error: "Bad request" },
      { status: 400 }
    );
  }
}
