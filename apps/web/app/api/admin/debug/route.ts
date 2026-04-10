import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const all = await prisma.knowledgeBase.findMany({
    select: { id: true, title: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ count: all.length, items: all });
}
