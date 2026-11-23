import { connection } from "next/server";
import { checkEvidence, deletePhoto, readPhoto, storePhoto } from "@/lib/evidence";
import { listProposals, parseProposal, rpcErrorResponse } from "@/lib/proposals";
import { db } from "@/lib/supabase";
import { PHOTO_OPTIONAL } from "@/lib/types";
import { currentUser, loginRequired } from "@/lib/user-auth";
import { errorResponse } from "@/lib/validate";

export async function GET(request: Request) {
  await connection();
  try {
    const scope = new URL(request.url).searchParams.get("scope") === "recent" ? "recent" : "pending";
    return Response.json(await listProposals(scope), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

/** 新建提案（multipart/form-data，必须附照片）。提案人的照片算作第一票「确认」。 */
export async function POST(request: Request) {
  try {
    const user = await currentUser(request);
    if (!user) return loginRequired();

    const form = await request.formData();
    const fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
    const input = await parseProposal(fields);
    // 修改类提案（改错字等）可以不附照片；新增和删除必须附照片
    const rawPhoto = form.get("photo");
    const hasPhoto = rawPhoto instanceof File && rawPhoto.size > 0;
    if (!hasPhoto && !PHOTO_OPTIONAL.has(input.kind)) await readPhoto(null); // 抛出「请附上一张照片」
    const photo = hasPhoto ? await readPhoto(rawPhoto) : null;

    const check = photo ? await checkEvidence(photo, input.claim, "confirm") : ({ ok: true, verdict: "unchecked", reason: "" } as const);
    if (!check.ok) return Response.json({ error: check.reason }, { status: 422 });

    const path = photo ? await storePhoto(photo) : null;
    const { data, error } = await db().rpc("create_proposal", {
      p_kind: input.kind,
      p_restaurant_id: input.restaurant_id,
      p_deal_id: input.deal_id,
      p_dish_id: input.dish_id,
      p_payload: input.payload,
      p_claim: input.claim,
      p_user: user.id,
      p_evidence_path: path,
      p_evidence_sha256: photo?.sha256 ?? null,
      p_ai_verdict: check.verdict,
      p_ai_reason: check.reason,
    });
    if (error) {
      if (path) await deletePhoto(path);
      return rpcErrorResponse(error) ?? errorResponse(error);
    }
    return Response.json({ ...data, ai_reason: check.reason }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
