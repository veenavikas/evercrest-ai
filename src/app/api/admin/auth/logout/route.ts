import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function handleLogout(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete("evercrest_admin_session");

  // Check if request expects JSON or HTML navigation
  const acceptHeader = request.headers.get("accept") || "";
  if (acceptHeader.includes("application/json")) {
    return NextResponse.json({ success: true, redirectUrl: "/admin/login" });
  }

  const redirectUrl = new URL("/admin/login", request.url);
  return NextResponse.redirect(redirectUrl, 303);
}

export async function POST(request: Request) {
  return handleLogout(request);
}

export async function GET(request: Request) {
  return handleLogout(request);
}

