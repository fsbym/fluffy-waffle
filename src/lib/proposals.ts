import "server-only";
import { geocodeAddress } from "./geocode";
import { db } from "./supabase";
import { formatPrice, type Deal, type Dish, type Proposal, type ProposalKind, type Restaurant, type Stance, type Vote } from "./types";
import { BadRequest, date, int, price, text } from "./validate";

const KIND_LABEL = { discount: "折扣", coupon: "优惠券" } as const;

type Body = Record<string, unknown>;

export type ProposalInput = {
  kind: ProposalKind;
  restaurant_id: number | null;
  deal_id: number | null;
  dish_id: number | null;
  payload: Record<string, string | null>;
  claim: string;
};

async function getRestaurant(id: number) {
  const { data, error } = await db()
    .from("restaurants")
    .select("id, name, category, address, price_range, emoji, is_active")
    .eq("id", id)
    .maybeSingle<Pick<Restaurant, "id" | "name" | "category" | "address" | "price_range" | "emoji" | "is_active">>();
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

async function getDish(id: number) {
  const { data, error } = await db()
    .from("dishes")
    .select("id, name, price, note, is_active, restaurant_id, restaurants(name)")
    .eq("id", id)
    .maybeSingle<Pick<Dish, "id" | "name" | "note" | "is_active" | "restaurant_id"> & { price: number | string; restaurants: { name: string } }>();
  if (error) throw error;
  if (!data) throw new BadRequest("找不到这道菜");
  return { ...data, price: Number(data.price) };
}

function dealKind(value: unknown): "discount" | "coupon" {
  if (value !== "discount" && value !== "coupon") throw new BadRequest("优惠类型只能是折扣或优惠券");
  return value;
}

/** 校验提案内容，并在服务器端根据数据库现状生成「主张」文字（不信任客户端传来的描述）。 */
export async function parseProposal(body: Body): Promise<ProposalInput> {
  switch (body.kind) {
    case "add_restaurant": {
      const name = text(body, "name", { max: 80, required: true, label: "店名" })!;
      const address = text(body, "address", { max: 160, required: true, label: "地址" })!;
      const category = text(body, "category", { max: 20, required: true, label: "分类" })!;
      const price_range = text(body, "price_range", { max: 30, label: "人均" });
      const emoji = text(body, "emoji", { max: 8, label: "图标" });
      const dish_name = text(body, "dish_name", { max: 60, label: "菜名" });
      const dish_price = price(body, "dish_price", { required: Boolean(dish_name) });
      if (dish_price !== null && !dish_name) throw new BadRequest("填了价格的话，也请写上菜名");
      const dish_note = dish_name ? text(body, "dish_note", { max: 120, label: "推荐理由" }) : null;
      const { lat, lng } = await geocodeAddress(name, address);
      return {
        kind: "add_restaurant", restaurant_id: null, deal_id: null, dish_id: null,
        payload: {
          name, address, category, price_range, emoji, lat: String(lat), lng: String(lng),
          dish_name, dish_price: dish_price === null ? null : String(dish_price), dish_note,
        },
        claim: `新店家：${name}（${category}，${address}）${dish_name ? `，推荐「${dish_name}」税前 ${formatPrice(dish_price!)}` : ""}`,
      };
    }
    case "update_restaurant": {
      const r = await getRestaurant(int(body, "restaurant_id", { min: 1 }) ?? 0);
      const name = text(body, "name", { max: 80, required: true, label: "店名" })!;
      const address = text(body, "address", { max: 160, required: true, label: "地址" })!;
      const category = text(body, "category", { max: 20, required: true, label: "分类" })!;
      const price_range = text(body, "price_range", { max: 30, label: "人均" });
      const emoji = text(body, "emoji", { max: 8, label: "图标" }) ?? r.emoji;
      const changes = [
        name !== r.name ? `店名改为「${name}」` : null,
        address !== r.address ? `地址改为 ${address}` : null,
        category !== r.category ? `分类改为「${category}」` : null,
        price_range !== r.price_range ? `人均改为 ${price_range ?? "（空）"}` : null,
        emoji !== r.emoji ? `图标改为 ${emoji}` : null,
      ].filter(Boolean);
      if (changes.length === 0) throw new BadRequest("内容和现在一样，没有变化");
      const payload: Record<string, string | null> = { name, address, category, price_range, emoji };
      if (address !== r.address) {
        const { lat, lng } = await geocodeAddress(name, address);
        payload.lat = String(lat);
        payload.lng = String(lng);
      }
      return {
        kind: "update_restaurant", restaurant_id: r.id, deal_id: null, dish_id: null, payload,
        claim: `修改店家「${r.name}」：${changes.join("，")}`,
      };
    }
    case "remove_restaurant": {
      const r = await getRestaurant(int(body, "restaurant_id", { min: 1 }) ?? 0);
      if (!r.is_active) throw new BadRequest("这家店已经下架了");
      const reason = text(body, "reason", { max: 80, label: "原因" });
      return {
        kind: "remove_restaurant", restaurant_id: r.id, deal_id: null, dish_id: null, payload: { reason },
        claim: `${r.name} ${reason ? `：${reason}` : "已经关门了"}`,
      };
    }
    case "add_deal": {
      const restaurant = await getRestaurant(int(body, "restaurant_id", { min: 1 }) ?? 0);
      const kind = dealKind(body.deal_kind);
      const title = text(body, "title", { max: 120, required: true, label: "优惠内容" })!;
      const ends_on = date(body, "ends_on");
      const source = text(body, "source", { max: 40, label: "来源" });
      return {
        kind: "add_deal", restaurant_id: restaurant.id, deal_id: null, dish_id: null,
        payload: { deal_kind: kind, title, ends_on, source },
        claim: `${restaurant.name} 有${KIND_LABEL[kind]}：「${title}」${ends_on ? `，截至 ${ends_on}` : ""}`,
      };
    }
    case "update_deal": {
      const deal = await getDeal(int(body, "deal_id", { min: 1 }) ?? 0);
      const title = text(body, "title", { max: 120, required: true, label: "优惠内容" })!;
      const kind = body.deal_kind === undefined || body.deal_kind === "" ? deal.kind : dealKind(body.deal_kind);
      const ends_on = date(body, "ends_on");
      if (title === deal.title && kind === deal.kind && ends_on === deal.ends_on) throw new BadRequest("内容和现在一样，没有变化");
      return {
        kind: "update_deal", restaurant_id: deal.restaurant_id, deal_id: deal.id, dish_id: null,
        payload: { deal_kind: kind, title, ends_on },
        claim: `${deal.restaurants.name} 的「${deal.title}」变成了「${title}」${ends_on ? `，截至 ${ends_on}` : ""}`,
      };
    }
    case "remove_deal": {
      const deal = await getDeal(int(body, "deal_id", { min: 1 }) ?? 0);
      if (!deal.is_active) throw new BadRequest("这条优惠已经下架了");
      return {
        kind: "remove_deal", restaurant_id: deal.restaurant_id, deal_id: deal.id, dish_id: null, payload: {},
        claim: `${deal.restaurants.name} 的「${deal.title}」已经取消了`,
      };
    }
    case "add_dish": {
      const restaurant = await getRestaurant(int(body, "restaurant_id", { min: 1 }) ?? 0);
      const name = text(body, "name", { max: 60, required: true, label: "菜名" })!;
      const p = price(body, "price", { required: true })!;
      const note = text(body, "note", { max: 120, label: "推荐理由" });
      return {
        kind: "add_dish", restaurant_id: restaurant.id, deal_id: null, dish_id: null,
        payload: { name, price: String(p), note },
        claim: `${restaurant.name} 的「${name}」好吃，税前 ${formatPrice(p)}`,
      };
    }
    case "update_dish": {
      const dish = await getDish(int(body, "dish_id", { min: 1 }) ?? 0);
      const name = text(body, "name", { max: 60, required: true, label: "菜名" })!;
      const p = price(body, "price", { required: true })!;
      const note = text(body, "note", { max: 120, label: "推荐理由" });
      if (name === dish.name && p === dish.price && note === dish.note) throw new BadRequest("内容和现在一样，没有变化");
      const changes = [
        name !== dish.name ? `改名为「${name}」` : null,
        p !== dish.price ? `税前价格 ${formatPrice(dish.price)} → ${formatPrice(p)}` : null,
        note !== dish.note ? "更新了推荐理由" : null,
      ].filter(Boolean).join("，");
      return {
        kind: "update_dish", restaurant_id: dish.restaurant_id, deal_id: null, dish_id: dish.id,
        payload: { name, price: String(p), note },
        claim: `${dish.restaurants.name} 的「${dish.name}」：${changes}`,
      };
    }
    case "remove_dish": {
      const dish = await getDish(int(body, "dish_id", { min: 1 }) ?? 0);
      if (!dish.is_active) throw new BadRequest("这道菜已经下架了");
      return {
        kind: "remove_dish", restaurant_id: dish.restaurant_id, deal_id: null, dish_id: dish.id, payload: {},
        claim: `${dish.restaurants.name} 的「${dish.name}」已经不卖了`,
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

type VoteRow = { id: number; user_id: string; stance: Stance; evidence_path: string | null; ai_verdict: Vote["ai_verdict"]; ai_reason: string | null; created_at: string };
type ProposalRow = Omit<Proposal, "votes" | "confirms" | "rejects"> & { created_by: string; votes: VoteRow[] };

/** 公开列表：投票人用「提案人 / 同学 B / 同学 C…」匿名展示，不暴露账号。 */
export async function listProposals(scope: "pending" | "recent"): Promise<Proposal[]> {
  let query = db()
    .from("proposals")
    .select("id, kind, restaurant_id, deal_id, dish_id, claim, status, created_at, expires_at, created_by, votes(id, user_id, stance, evidence_path, ai_verdict, ai_reason, created_at)")
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
      // 不把照片在存储里的路径暴露给前端，只告诉它有没有照片
      votes: sorted.map(({ user_id, evidence_path, ...v }) => ({ ...v, has_photo: Boolean(evidence_path), voter: aliases.get(user_id)! })),
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
