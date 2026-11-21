import type { NextRequest } from "next/server";
import { isAdmin, unauthorized } from "@/lib/admin-auth";
import { db } from "@/lib/supabase";
import type { Submission } from "@/lib/types";
import { BadRequest, errorResponse, int, readJson, text } from "@/lib/validate";

/**
 * 审核用户提交：
 * - { action: "approve", restaurant_id, title? } → 生成一条折扣并标记为已通过
 * - { action: "reject" } → 标记为已拒绝
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/submissions/[id]">) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id < 1) throw new BadRequest("id 不对");
    const body = await readJson(request);

    const { data: submission, error: readError } = await db().from("submissions").select("*").eq("id", id).maybeSingle<Submission>();
    if (readError) throw readError;
    if (!submission) return Response.json({ error: "找不到这条提交" }, { status: 404 });
    if (submission.status !== "pending") throw new BadRequest("这条提交已经处理过了");

    if (body.action === "reject") {
      const { error } = await db().from("submissions").update({ status: "rejected" }).eq("id", id).eq("status", "pending");
      if (error) throw error;
      return Response.json({ ok: true });
    }
    if (body.action !== "approve") throw new BadRequest("action 只能是 approve 或 reject");

    const restaurantId = int(body, "restaurant_id", { min: 1 }) ?? submission.restaurant_id;
    if (!restaurantId) throw new BadRequest("请先选择这条折扣属于哪家店");
    const title = text(body, "title", { max: 120 }) ?? submission.title;

    // 先把状态从 pending 改掉，避免同一条提交被重复通过生成两条折扣。
    const { data: claimed, error: claimError } = await db()
      .from("submissions")
      .update({ status: "approved", restaurant_id: restaurantId })
      .eq("id", id)
      .eq("status", "pending")
      .select("id");
    if (claimError) throw claimError;
    if (!claimed?.length) throw new BadRequest("这条提交已经处理过了");

    const { error: insertError } = await db().from("deals").insert({
      restaurant_id: restaurantId,
      kind: submission.kind,
      title,
      source: submission.source ?? "用户提交",
      ends_on: submission.ends_on,
    });
    if (insertError) {
      await db().from("submissions").update({ status: "pending" }).eq("id", id);
      throw insertError;
    }
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
