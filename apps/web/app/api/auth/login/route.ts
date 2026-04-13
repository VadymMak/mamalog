import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validateEmail } from "@/lib/validations";

interface LoginBody {
  email: string;
  password: string;
}

interface ApiResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
  language?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ id: string; email: string; name: string | null; role: string }>>> {
  try {
    const body: LoginBody = await req.json();
    const { email, password } = body;

    // Validation
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Valid email is required" },
        { status: 400 }
      );
    }
    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Compare password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          expiresAt: new Date(Date.now() + 86400_000 * 30).toISOString(),
        },
        language: user.language,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/auth/login] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
