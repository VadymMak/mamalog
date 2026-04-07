import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  validateEmail,
  validatePassword,
  validateName,
} from "@/lib/validations";

interface RegisterBody {
  email: string;
  password: string;
  name: string;
  language?: string;
}

interface ApiResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
  language?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ id: string; email: string; name: string | null; role: string }>>> {
  try {
    const body: RegisterBody = await req.json();
    const { email, password, name, language = "ru" } = body;

    // Validation
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Valid email is required" },
        { status: 400 }
      );
    }
    if (!password || !validatePassword(password)) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }
    if (!name || !validateName(name)) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    // Check existing user
    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user, then settings and subscription with manual rollback on failure
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        passwordHash: hashedPassword,
        role: "MAMA",
        language: language || "ru",
      },
    });

    try {
      await prisma.userSettings.create({
        data: { userId: user.id, language: language || "ru" },
      });
      await prisma.subscription.create({
        data: { userId: user.id, plan: "FREE" },
      });
    } catch (e) {
      await prisma.user.delete({ where: { id: user.id } });
      throw e;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        language,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/auth/register] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
