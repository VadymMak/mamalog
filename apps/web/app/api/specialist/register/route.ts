import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validateEmail, validatePassword, validateName } from "@/lib/validations";

interface RegisterBody {
  email: string;
  password: string;
  name: string;
  specialty: string;
  bio?: string;
  experience?: number;
  diplomaUrl?: string;
  language?: string;
}

// ─── POST /api/specialist/register — no auth required ────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: RegisterBody = await req.json();
    const {
      email,
      password,
      name,
      specialty,
      bio,
      experience,
      diplomaUrl,
      language = "ru",
    } = body;

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
    if (!specialty || specialty.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Specialty is required" },
        { status: 400 }
      );
    }

    // Check email not already registered (User or Specialist)
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "User with this email already exists" },
        { status: 409 }
      );
    }
    const existingSpecialist = await prisma.specialist.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existingSpecialist) {
      return NextResponse.json(
        { success: false, error: "Specialist with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create User + Specialist in a transaction
    const { specialist } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.trim().toLowerCase(),
          name: name.trim(),
          passwordHash,
          role: "SPECIALIST",
          language,
        },
      });

      const specialist = await tx.specialist.create({
        data: {
          userId: user.id,
          email: email.trim().toLowerCase(),
          name: name.trim(),
          specialty: specialty.trim(),
          bio: bio?.trim() || null,
          experience: experience ?? null,
          diplomaUrl: diplomaUrl?.trim() || null,
          status: "PENDING",
        },
      });

      return { user, specialist };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Заявка отправлена. Ожидайте проверки администратором.",
        data: { id: specialist.id },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/specialist/register]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
