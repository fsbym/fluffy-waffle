import "server-only";
import { geocodeAddress } from "./geocode";
import { db } from "./supabase";
import type { Deal, Proposal, ProposalKind, Restaurant, Stance, Vote } from "./types";
import { BadRequest, date, int, text } from "./validate";

const KIND_LABEL = { discount: "折扣", coupon: "优惠券" } as const;

type Body = Record<string, unknown>;

export type ProposalInput = {
  kind: ProposalKind;
  restaurant_id: number | null;
  deal_id: number | null;
  payload: Record<string, string | null>;
  claim: string;
};

async function getRestaurant(id: number) {
  const { data, error } = await db().from("restaurants").select("id, name").eq("id", id).maybeSingle<Pick<Restaurant, "id" | "name">>();
  if (error) throw error;
  if (!data) throw new BadRequest("找不到这家店");
  return data;
}

async function getDeal(id: number) {
  const { data, error } = await db()
    .from("deals")
    .select("id, kind, title, ends_on, is_active, restaurant_id, restaurants(name)")
    .eq("id", id)
    .maybeSingle<Pick<Deal, "id" | "kind" | "title" | "ends_on" | "is_active" | "restaurant_id"> & { restaurants: { name: string } }>();
  if (error) throw error;
  if (!data) throw new BadRequest("找不到这条优惠");
  return data;
}

function dealKind(value: unknown): "discount" | "coupon" {
  if (value !== "discount" && value !== "coupon") throw new BadRequest("优惠类型只能是折扣或优惠券");
  return value;
}

/** 校验提案内容，并在服务器端根据数据库现状生成「主张」文字（不信任客户端传来的描述）。 */
export async function parseProposal(body: Body): Promise<ProposalInput> {
  switch (body.kind) {
    case "add_restaurant": {
      const name = text(body, "name", { max: 80, required: true })!;
      const address = text(body, "address", { max: 160, required: true })!;
      const category = text(body, "category", { max: 20, required: true })!;
      const price_range = text(body, "price_range", { max: 30 });
      const emoji = text(body, "emoji", { max: 8 });
      const { lat, lng } = await geocodeAddress(name, address);
      return {
        kind: "add_restaurant", restaurant_id: null, deal_id: null,
        payload: { name, address, category, price_range, emoji, lat: String(lat), lng: String(lng) },
        claim: `新店家：${name}（${category}，${address}）`,
      };
    }
    case "add_deal": {
      const restaurant = await getRestaurant(int(body, "restaurant_id", { min: 1 }) ?? 0);
      const kind = dealKind(body.deal_kind);
      const title = text(body, "title", { max: 120, required: true })!;
      const ends_on = date(body, "ends_on");
      const source = text(body, "source", { max: 40 });
      return {
        kind: "add_deal", restaurant_id: restaurant.id, deal_id: null,
        payload: { deal_kind: kind, title, ends_on, source },
        claim: `${restaurant.name} 有${KIND_LABEL[kind]}：「${title}」${ends_on ? `，截至 ${ends_on}` : ""}`,
      };
    }
    case "update_deal": {
      const deal = await getDeal(int(body, "deal_id", { min: 1 }) ?? 0);
      const title = text(body, "title", { max: 120, required: true })!;
      const kind = body.deal_kind === undefined || body.deal_kind === "" ? deal.kind : dealKind(body.deal_kind);
      const ends_on = date(body, "ends_on");
      if (title === deal.title && kind === deal.kind && ends_on === deal.ends_on) throw new BadRequest("内容和现在一样，没有变化");
      return {
        kind: "update_deal", restaurant_id: deal.restaurant_id, deal_id: deal.id,
        payload: { deal_kind: kind, title, ends_on },
        claim: `${deal.restaurants.name} 的「${deal.title}」变成了「${title}」${ends_on ? `，截至 ${ends_on}` : ""}`,
      };
    }
    case "remove_deal": {
      const deal = await getDeal(int(body, "deal_id", { min: 1 }) ?? 0);
      if (!deal.is_active) throw new BadRequest("这条优惠已经下架了");
      return {
        kind: "remove_deal", restaurant_id: deal.restaurant_id, deal_id: deal.id, payload: {},
        claim: `${deal.restaurants.name} 的「${deal.title}」已经取消了`,
      };
    }
    default:
      throw new BadRequest("未知的提案类型");
  }
}

export async function getProposalClaim(id: number): Promise<{ claim: string; status: string; expired: boolean }> {
  const { data, error } = await db().from("proposals").select("claim, status, expires_at").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new BadRequest("找不到这个提案");
  return { claim: data.claim, status: data.status, expired: new Date(data.expires_at) < new Date() };
}

type VoteRow = { id: number; user_id: string; stance: Stance; ai_verdict: Vote["ai_verdict"]; ai_reason: string | null; created_at: string };
type ProposalRow = Omit<Proposal, "votes" | "confirms" | "rejects"> & { created_by: string; votes: VoteRow[] };

/** 公开列表：投票人用「提案人 / 同学 B / 同学 C…」匿名展示，不暴露账号。 */
export async function listProposals(scope: "pending" | "recent"): Promise<Proposal[]> {
  let query = db()
    .from("proposals")
    .select("id, kind, restaurant_id, deal_id, claim, status, created_at, expires_at, created_by, votes(id, user_id, stance, ai_verdict, ai_reason, created_at)")
    .order("created_at", { ascending: false })
    .limit(100);
  query = scope === "pending"
    ? query.eq("status", "pending").gt("expires_at", new Date().toISOString())
    : query.neq("status", "pending").gt("resolved_at", new Date(Date.now() - 14 * 864e5).toISOString());
  const { data, error } = await query;
  if (error) throw error;

  return (data as ProposalRow[]).map(({ created_by, votes, ...p }) => {
    const sorted = [...votes].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
    const aliases = new Map<string, string>([[created_by, "提案人"]]);
    for (const v of sorted) if (!aliases.has(v.user_id)) aliases.set(v.user_id, `同学 ${String.fromCharCode(65 + aliases.size)}`);
    return {
      ...p,
      confirms: votes.filter((v) => v.stance === "confirm").length,
      rejects: votes.filter((v) => v.stance === "reject").length,
      votes: sorted.map(({ user_id, ...v }) => ({ ...v, voter: aliases.get(user_id)! })),
    };
  });
}

/** 把数据库函数抛出的错误翻译成用户能看懂的提示。 */
export function rpcErrorResponse(error: { message?: string; code?: string } | null): Response | null {
  if (!error) return null;
  const msg = error.message ?? "";
  const table: [RegExp, number, string][] = [
    [/rate_limited/, 429, "操作太频繁了，明天再来吧"],
    [/duplicate_pending/, 409, "这条优惠已经有一个待确认的提案了，去「待确认」里帮忙投票吧"],
    [/closed/, 409, "这个提案已经结束了"],
    [/not_found/, 404, "找不到这个提案"],
    [/votes_one_per_user/, 409, "你已经投过票了"],
    [/votes_unique_evidence/, 409, "这张照片已经有人用过了，请自己拍一张"],
  ];
  for (const [pattern, status, text] of table) if (pattern.test(msg)) return Response.json({ error: text }, { status });
  return null;
}
