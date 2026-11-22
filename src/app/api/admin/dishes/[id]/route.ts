import type { NextRequest } from "next/server";
import { isAdmin, unauthorized } from "@/lib/admin-auth";
import { db } from "@/lib/supabase";
import { BadRequest, bool, errorResponse, price, readJson, text } from "@/lib/validate";

async function idFrom(ctx: RouteContext<"/api/admin/dishes/[id]">): Promise<number> {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id < 1) throw new BadRequest("id 不对");
  return id;
}

/** 管理员处理违规内容：改名 / 改价 / 下架。所有改动同样写进公开账本。 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/dishes/[id]">) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const id = await idFrom(ctx);
    const body = await readJson(request);
    const changes: Record<string, unknown> = {};
    if ("name" in body) changes.name = text(body, "name", { max: 60, required: true });
    if ("price" in body) changes.price = price(body, "price", { required: true });
    if ("note" in body) changes.note = text(body, "note", { max: 120 });
    const active = bool(body, "is_active");
    if (active !== undefined) changes.is_active = active;
    if (Object.keys(changes).length === 0) throw new BadRequest("没有要修改的内容");
    const { error, count } = await db().from("dishes").update(changes, { count: "exact" }).eq("id", id);
    if (error) throw error;
    if (!count) return Response.json({ error: "找不到这道菜" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/admin/dishes/[id]">) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const { error } = await db().from("dishes").delete().eq("id", await idFrom(ctx));
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
