export type DealKind = "discount" | "coupon";

export type Deal = {
  id: number;
  restaurant_id: number;
  kind: DealKind;
  title: string;
  source: string | null;
  starts_on: string | null;
  ends_on: string | null;
  last_verified_on: string;
  is_active: boolean;
};

export type Restaurant = {
  id: number;
  name: string;
  category: string;
  address: string;
  price_range: string | null;
  walk_minutes: number | null;
  rating: number | null;
  lat: number | null;
  lng: number | null;
  emoji: string;
  color: string;
  accent: string;
  deals: Deal[];
};

export type ProposalKind = "add_restaurant" | "add_deal" | "update_deal" | "remove_deal";
export type ProposalStatus = "pending" | "applied" | "rejected" | "expired" | "cancelled";
export type Stance = "confirm" | "reject";

export type Vote = {
  id: number;
  stance: Stance;
  voter: string; // 匿名代号，例如「同学 A」
  ai_verdict: "supports" | "contradicts" | "unclear" | "unchecked";
  ai_reason: string | null;
  created_at: string;
};

export type Proposal = {
  id: number;
  kind: ProposalKind;
  restaurant_id: number | null;
  deal_id: number | null;
  claim: string;
  status: ProposalStatus;
  created_at: string;
  expires_at: string;
  confirms: number;
  rejects: number;
  votes: Vote[];
};

export type LedgerEntry = {
  seq: number;
  prev_hash: string;
  hash: string;
  body: string;
  created_at: string;
};

/**
 * 每种提案需要多少人（含提案人）附证据确认才生效；反对达到同样人数则驳回。
 * 需与 supabase/schema.sql 中的 proposal_threshold 保持一致。
 */
export const THRESHOLDS: Record<ProposalKind, number> = {
  add_deal: 1, // 新增优惠：附照片提交即生效
  update_deal: 1, // 修改优惠：附照片提交即生效
  add_restaurant: 1, // 新增店家：附照片提交即生效
  remove_deal: 2, // 取消优惠：2 人确认
};
export const GENESIS_HASH = "0".repeat(64);
