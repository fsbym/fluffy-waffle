import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, checkPassword, isAdmin } from "@/lib/admin-auth";
import { errorResponse, readJson } from "@/lib/validate";

export async function GET(request: NextRequest) {
  return NextResponse.json({ loggedIn: isAdmin(request) });
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const token = typeof body.password === "string" ? checkPassword(body.password) : null;
    if (!token) return NextResponse.json({ error: "密码不对" }, { status: 401 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}
