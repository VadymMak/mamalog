import { NextRequest, NextResponse } from "next/server";
import { toFile } from "openai";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { getRequiredSession, getUserId } from "@/lib/session";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

// ─── POST /api/voice ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await getRequiredSession();
  if (!auth.ok) return auth.response;
  const userId = getUserId(auth.session);

  try {
    const formData = await req.formData();
    const audioField = formData.get("audio");
    const logEntryId = formData.get("logEntryId");
    const languageField = formData.get("language");

    if (!audioField || !(audioField instanceof File)) {
      return NextResponse.json(
        { success: false, error: "audio file is required" },
        { status: 400 }
      );
    }

    if (!audioField.type.startsWith("audio/")) {
      return NextResponse.json(
        { success: false, error: "File must be an audio file (audio/*)" },
        { status: 400 }
      );
    }

    if (audioField.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "Audio file must be smaller than 25 MB" },
        { status: 400 }
      );
    }

    const language =
      typeof languageField === "string" && languageField.length > 0
        ? languageField
        : "ru";

    // If logEntryId provided — verify it exists and belongs to user
    if (typeof logEntryId === "string" && logEntryId.length > 0) {
      const logEntry = await prisma.logEntry.findUnique({
        where: { id: logEntryId },
        select: { userId: true },
      });

      if (!logEntry) {
        return NextResponse.json(
          { success: false, error: "Log entry not found" },
          { status: 404 }
        );
      }

      if (logEntry.userId !== userId) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    // Convert File to OpenAI-compatible file object
    const arrayBuffer = await audioField.arrayBuffer();
    const audioFile = await toFile(
      Buffer.from(arrayBuffer),
      audioField.name || "audio.webm",
      { type: audioField.type }
    );

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language,
    });

    const transcript = transcription.text;

    // Update LogEntry transcript if logEntryId provided
    if (typeof logEntryId === "string" && logEntryId.length > 0) {
      await prisma.logEntry.update({
        where: { id: logEntryId },
        data: { transcript },
      });
    }

    return NextResponse.json({
      success: true,
      data: { transcript, language },
    });
  } catch (err) {
    console.error("[POST /api/voice] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
