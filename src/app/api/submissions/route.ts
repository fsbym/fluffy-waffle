import { db } from "@/lib/supabase";
import { BadRequest, date, errorResponse, int, kind, readJson, text } from "@/lib/validate";

/** 用户提交新折扣线索，进入待审核队列，管理员在 /admin 审核后才会上线。 */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    // 简单的反机器人字段：真实用户看不到这个输入框，不会填写。
    if (typeof body.website === "string" && body.website) return Response.json({ ok: true }, { status: 201 });

    const row = {
      restaurant_id: int(body, "restaurant_id", { min: 1 }),
      restaurant_name: text(body, "restaurant_name", { max: 80, required: true }),
      kind: kind(body),
      title: text(body, "title", { max: 120, required: true }),
      source: text(body, "source", { max: 40 }),
      ends_on: date(body, "ends_on"),
      note: text(body, "note", { max: 500 }),
    };
    if (!row.title) throw new BadRequest("请填写折扣内容");

    const { error } = await db().from("submissions").insert(row);
    if (error) throw error;
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
