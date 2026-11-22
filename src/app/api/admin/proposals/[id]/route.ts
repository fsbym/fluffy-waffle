import type { NextRequest } from "next/server";
import { isAdmin, unauthorized } from "@/lib/admin-auth";
import { db } from "@/lib/supabase";
import { BadRequest, errorResponse, readJson } from "@/lib/validate";

/** 管理员撤销违规提案（例如照片不当）。这个操作同样会写进公开账本。 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/proposals/[id]">) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id < 1) throw new BadRequest("id 不对");
    const body = await readJson(request);
    if (body.action !== "cancel") throw new BadRequest("action 只能是 cancel");
    const { data, error } = await db()
      .from("proposals")
      .update({ status: "cancelled", resolved_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending")
      .select("id");
    if (error) throw error;
    if (!data?.length) return Response.json({ error: "提案不存在或已经结束" }, { status: 409 });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
