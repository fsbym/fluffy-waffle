import type { DealKind } from "./types";

export class BadRequest extends Error {}

type Body = Record<string, unknown>;

export function text(body: Body, key: string, opts: { max: number; required?: boolean; label?: string }): string | null {
  const value = body[key];
  const label = opts.label ?? key;
  if (value === undefined || value === null || value === "") {
    if (opts.required) throw new BadRequest(`请填写${label}`);
    return null;
  }
  if (typeof value !== "string") throw new BadRequest(`${label}格式不对`);
  const trimmed = value.trim();
  if (opts.required && !trimmed) throw new BadRequest(`请填写${label}`);
  if (trimmed.length > opts.max) throw new BadRequest(`${label}太长（最多 ${opts.max} 字）`);
  return trimmed || null;
}

export function date(body: Body, key: string): string | null {
  const value = text(body, key, { max: 10 });
  if (value === null) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new BadRequest(`${key} 日期格式应为 YYYY-MM-DD`);
  return value;
}

export function int(body: Body, key: string, opts: { min?: number; max?: number } = {}): number | null {
  const value = body[key];
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || (opts.min !== undefined && n < opts.min) || (opts.max !== undefined && n > opts.max)) {
    throw new BadRequest(`${key} 数值不对`);
  }
  return n;
}

export function num(body: Body, key: string, opts: { min: number; max: number }): number | null {
  const value = body[key];
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < opts.min || n > opts.max) throw new BadRequest(`${key} 数值不对`);
  return n;
}

/** 税前价格：0 < 价格 < 1000，最多两位小数，可以带 $ 号 */
export function price(body: Body, key: string, opts: { required?: boolean } = {}): number | null {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === "") {
    if (opts.required) throw new BadRequest("请填写税前价格");
    return null;
  }
  const n = Number(String(raw).trim().replace(/^\$/, ""));
  if (!Number.isFinite(n) || n <= 0 || n >= 1000 || Math.abs(Math.round(n * 100) - n * 100) > 1e-6) {
    throw new BadRequest("价格格式不对，例如 12.99");
  }
  return n;
}

export function kind(body: Body): DealKind {
  const value = body.kind;
  if (value !== "discount" && value !== "coupon") throw new BadRequest("kind 只能是 discount 或 coupon");
  return value;
}

export function bool(body: Body, key: string): boolean | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new BadRequest(`${key} 格式不对`);
  return value;
}

export async function readJson(request: Request): Promise<Body> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Body;
  } catch {
    throw new BadRequest("请求内容不是有效的 JSON");
  }
}

/** 把 BadRequest 转成 400，其它错误记录日志后返回 500。 */
export function errorResponse(error: unknown): Response {
  if (error instanceof BadRequest) return Response.json({ error: error.message }, { status: 400 });
  console.error(error);
  return Response.json({ error: "服务器出错了，请稍后再试" }, { status: 500 });
}
