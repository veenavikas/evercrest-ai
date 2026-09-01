import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";

async function handleLogout() {
  try {
    await clearSession();
    return NextResponse.json({ success: true, redirectUrl: "/login" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}

export async function POST() {
  return handleLogout();
}

export async function GET() {
  return handleLogout();
}

