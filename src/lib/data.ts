import "server-only";
import { db, torontoToday } from "./supabase";
import type { Deal, Dish, Restaurant } from "./types";
import { BadRequest, date, int, kind, num, text, bool } from "./validate";

const RESTAURANT_COLUMNS = "id, name, category, address, price_range, walk_minutes, rating, lat, lng, emoji, color, accent";
const DEAL_COLUMNS = "id, restaurant_id, kind, title, source, starts_on, ends_on, last_verified_on, is_active";
const DISH_COLUMNS = "id, restaurant_id, name, price, note, last_verified_on, is_active";

function isCurrent(deal: Deal, today: string): boolean {
  return deal.is_active && (!deal.starts_on || deal.starts_on <= today) && (!deal.ends_on || deal.ends_on >= today);
}

async function fetchRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await db()
    .from("restaurants")
    .select(`${RESTAURANT_COLUMNS}, deals(${DEAL_COLUMNS}), dishes(${DISH_COLUMNS})`)
    .order("walk_minutes", { ascending: true, nullsFirst: false })
    .order("id");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    rating: r.rating === null ? null : Number(r.rating),
    deals: [...(r.deals as Deal[])].sort((a, b) => a.kind.localeCompare(b.kind) || a.id - b.id),
    dishes: (r.dishes as Dish[]).map((d) => ({ ...d, price: Number(d.price) })).sort((a, b) => a.id - b.id),
  })) as Restaurant[];
}

/** 前台：只返回当前有效（启用且在有效期内）的折扣。 */
export async function listPublicRestaurants(): Promise<Restaurant[]> {
  const today = torontoToday();
  const restaurants = await fetchRestaurants();
  return restaurants.map((r) => ({ ...r, deals: r.deals.filter((d) => isCurrent(d, today)), dishes: r.dishes.filter((d) => d.is_active) }));
}

/** 后台：返回全部折扣，包括已停用和已过期的。 */
export const listAllRestaurants = fetchRestaurants;

type Body = Record<string, unknown>;

export function parseRestaurant(body: Body, partial: boolean) {
  const required = !partial;
  const fields = {
    name: text(body, "name", { max: 80, required }),
    category: text(body, "category", { max: 20, required }),
    address: text(body, "address", { max: 160, required }),
    price_range: text(body, "price_range", { max: 30 }),
    walk_minutes: int(body, "walk_minutes", { min: 0, max: 120 }),
    rating: num(body, "rating", { min: 0, max: 5 }),
    lat: num(body, "lat", { min: -90, max: 90 }),
    lng: num(body, "lng", { min: -180, max: 180 }),
    emoji: text(body, "emoji", { max: 8 }),
    color: text(body, "color", { max: 9 }),
    accent: text(body, "accent", { max: 9 }),
  };
  for (const key of ["color", "accent"] as const) {
    if (fields[key] && !/^#[0-9a-fA-F]{6}$/.test(fields[key]!)) throw new BadRequest(`${key} 应为 #RRGGBB 颜色`);
  }
  return pick(body, fields, partial, ["emoji", "color", "accent"]);
}

export function parseDeal(body: Body, partial: boolean) {
  const fields = {
    restaurant_id: partial ? undefined : int(body, "restaurant_id", { min: 1 }),
    kind: partial && body.kind === undefined ? undefined : kind(body),
    title: text(body, "title", { max: 120, required: !partial }),
    source: text(body, "source", { max: 40 }),
    starts_on: date(body, "starts_on"),
    ends_on: date(body, "ends_on"),
    last_verified_on: date(body, "last_verified_on"),
    is_active: bool(body, "is_active"),
  };
  if (!partial && !fields.restaurant_id) throw new BadRequest("缺少 restaurant_id");
  if (fields.starts_on && fields.ends_on && fields.starts_on > fields.ends_on) throw new BadRequest("开始日期不能晚于结束日期");
  return pick(body, fields, partial, ["last_verified_on", "is_active"]);
}

/**
 * 新建时：去掉 undefined，并去掉为 null 的「有数据库默认值」字段。
 * 更新时：只保留请求里真正出现的字段，这样没传的字段不会被清空。
 */
function pick<T extends Record<string, unknown>>(body: Body, fields: T, partial: boolean, hasDefault: (keyof T)[]): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(fields) as (keyof T)[]) {
    const value = fields[key];
    if (value === undefined) continue;
    if (partial && !(key in body)) continue;
    if (value === null && (hasDefault.includes(key) || (partial && isRequiredColumn(key as string)))) {
      if (partial && isRequiredColumn(key as string)) throw new BadRequest(`${String(key)} 不能为空`);
      continue;
    }
    out[key] = value;
  }
  return out;
}

function isRequiredColumn(key: string): boolean {
  return ["name", "category", "address", "title", "kind", "emoji", "color", "accent", "last_verified_on"].includes(key);
}
