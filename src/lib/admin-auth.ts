import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const ADMIN_COOKIE = "admin_session";

function expectedToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHmac("sha256", password).update("fluffy-waffle-admin").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(input: string): string | null {
  const password = process.env.ADMIN_PASSWORD;
  const token = expectedToken();
  if (!password || !token || !safeEqual(input, password)) return null;
  return token;
}

export function isAdmin(request: NextRequest): boolean {
  const token = expectedToken();
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  return Boolean(token && cookie && safeEqual(cookie, token));
}

export function unauthorized() {
  return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
}
