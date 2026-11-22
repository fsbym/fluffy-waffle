import { connection } from "next/server";
import { db } from "@/lib/supabase";
import { errorResponse } from "@/lib/validate";

/** 公开账本：按顺序返回，?after=<seq> 分页。任何人都可以下载下来自己验证哈希链。 */
export async function GET(request: Request) {
  await connection();
  try {
    const params = new URL(request.url).searchParams;
    const after = Math.max(0, Number(params.get("after")) || 0);
    const limit = Math.min(1000, Math.max(1, Number(params.get("limit")) || 500));
    const { data, error } = await db()
      .from("ledger")
      .select("seq, prev_hash, hash, body, created_at")
      .gt("seq", after)
      .order("seq")
      .limit(limit);
    if (error) throw error;
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
