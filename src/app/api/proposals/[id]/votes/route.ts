import { checkEvidence, deletePhoto, readPhoto, storePhoto } from "@/lib/evidence";
import { getProposalClaim, rpcErrorResponse } from "@/lib/proposals";
import { db } from "@/lib/supabase";
import { currentUser, loginRequired } from "@/lib/user-auth";
import { BadRequest, errorResponse } from "@/lib/validate";

/** 对提案投票（multipart/form-data：stance = confirm | reject，photo 必填）。 */
export async function POST(request: Request, ctx: RouteContext<"/api/proposals/[id]/votes">) {
  try {
    const user = await currentUser(request);
    if (!user) return loginRequired();

    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id < 1) throw new BadRequest("id 不对");
    const form = await request.formData();
    const stance = form.get("stance");
    if (stance !== "confirm" && stance !== "reject") throw new BadRequest("请选择确认或反对");

    const proposal = await getProposalClaim(id);
    if (proposal.status !== "pending" || proposal.expired) return Response.json({ error: "这个提案已经结束了" }, { status: 409 });

    const { count, error: votedError } = await db()
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("proposal_id", id)
      .eq("user_id", user.id);
    if (votedError) throw votedError;
    if (count) return Response.json({ error: "你已经投过票了" }, { status: 409 });

    const photo = await readPhoto(form.get("photo"));
    const check = await checkEvidence(photo, proposal.claim, stance);
    if (!check.ok) return Response.json({ error: check.reason }, { status: 422 });

    const path = await storePhoto(photo);
    const { data, error } = await db().rpc("cast_vote", {
      p_proposal: id,
      p_user: user.id,
      p_stance: stance,
      p_evidence_path: path,
      p_evidence_sha256: photo.sha256,
      p_ai_verdict: check.verdict,
      p_ai_reason: check.reason,
    });
    if (error) {
      await deletePhoto(path);
      return rpcErrorResponse(error) ?? errorResponse(error);
    }
    return Response.json({ ...data, ai_reason: check.reason }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
