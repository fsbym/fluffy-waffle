import { connection } from "next/server";
import { listPublicRestaurants } from "@/lib/data";
import { errorResponse } from "@/lib/validate";

// 每次请求都从数据库读取，后台改了折扣立刻生效。
export async function GET() {
  await connection();
  try {
    return Response.json(await listPublicRestaurants(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
