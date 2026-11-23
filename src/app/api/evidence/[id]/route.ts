import { signedPhotoUrl } from "@/lib/evidence";
import { db } from "@/lib/supabase";
import { errorResponse } from "@/lib/validate";

/** 证据照片：跳转到 Supabase Storage 的临时链接（照片桶是私有的）。 */
export async function GET(_request: Request, ctx: RouteContext<"/api/evidence/[id]">) {
  try {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id < 1) return new Response("Not found", { status: 404 });
    const { data, error } = await db().from("votes").select("evidence_path").eq("id", id).maybeSingle();
    if (error) throw error;
    const url = data?.evidence_path ? await signedPhotoUrl(data.evidence_path) : null;
    if (!url) return new Response("Not found", { status: 404 });
    return Response.redirect(url, 302);
  } catch (error) {
    return errorResponse(error);
  }
}
