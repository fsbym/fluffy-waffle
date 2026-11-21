import type { NextRequest } from "next/server";
import { isAdmin, unauthorized } from "@/lib/admin-auth";
import { parseRestaurant } from "@/lib/data";
import { db } from "@/lib/supabase";
import { BadRequest, errorResponse, readJson } from "@/lib/validate";

async function idFrom(ctx: RouteContext<"/api/admin/restaurants/[id]">): Promise<number> {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id < 1) throw new BadRequest("id 不对");
  return id;
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/restaurants/[id]">) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const id = await idFrom(ctx);
    const changes = parseRestaurant(await readJson(request), true);
    if (Object.keys(changes).length === 0) throw new BadRequest("没有要修改的内容");
    const { error, count } = await db().from("restaurants").update(changes, { count: "exact" }).eq("id", id);
    if (error) throw error;
    if (!count) return Response.json({ error: "找不到这家店" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/admin/restaurants/[id]">) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const { error } = await db().from("restaurants").delete().eq("id", await idFrom(ctx));
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
