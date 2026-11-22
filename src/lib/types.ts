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
  emoji: string;
  color: string;
  accent: string;
  deals: Deal[];
};

export const CATEGORIES = ["日料", "中餐", "西式", "甜点", "饮品", "快餐"] as const;

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

/** 需要多少人确认（含提案人）才能生效，需与 supabase/schema.sql 中的默认值一致。 */
export const CONFIRM_THRESHOLD = 3;
export const GENESIS_HASH = "0".repeat(64);
