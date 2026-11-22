import "server-only";
import { BadRequest } from "./validate";

/** 校园中心：King's College Circle（与 supabase/schema.sql 中的 walk_minutes_from_campus 一致） */
export const CAMPUS = { lat: 43.661753, lng: -79.395178 };
const MAX_DISTANCE_M = 5000;

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * 用 OpenStreetMap 的 Nominatim 把地址转成坐标。
 * 使用规范：每秒最多 1 次请求、带上能识别应用的 User-Agent。这里只在同学提交「新店家」时调用，量很小。
 */
export async function geocodeAddress(name: string, address: string): Promise<{ lat: number; lng: number }> {
  for (const q of [`${name}, ${address}`, address]) {
    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q, format: "jsonv2", limit: "1", countrycodes: "ca" })}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "campus-food-map/1.0", "Accept-Language": "en" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`地址查询服务出错（${response.status}）`);
    const [hit] = (await response.json()) as { lat: string; lon: string }[];
    if (!hit) continue;
    const point = { lat: Number(hit.lat), lng: Number(hit.lon) };
    if (distanceMeters(point, CAMPUS) > MAX_DISTANCE_M) throw new BadRequest("这个地址离多大 St. George 校区超过 5 公里，请检查一下地址");
    return point;
  }
  throw new BadRequest("在地图上找不到这个地址，请写成「门牌号 + 街道名」，例如 392 Queen St W");
}
