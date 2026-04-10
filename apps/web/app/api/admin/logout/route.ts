import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  const res = NextResponse.redirect(new URL("/admin/login", process.env.NEXTAUTH_URL || "http://localhost:3000"));
  res.cookies.delete("adminToken");
  return res;
}
