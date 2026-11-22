import "server-only";
import { db } from "./supabase";

export type CurrentUser = { id: string; email: string | null };

/** 从 Authorization: Bearer <Supabase access token> 中识别登录用户；未登录返回 null。 */
export async function currentUser(request: Request): Promise<CurrentUser | null> {
  const header = request.headers.get("authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

export function loginRequired() {
  return Response.json({ error: "请先登录" }, { status: 401 });
}
