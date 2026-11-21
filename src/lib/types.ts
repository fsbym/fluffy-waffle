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

export type Submission = {
  id: number;
  restaurant_id: number | null;
  restaurant_name: string;
  kind: DealKind;
  title: string;
  source: string | null;
  ends_on: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export const CATEGORIES = ["日料", "中餐", "西式", "甜点", "饮品", "快餐"] as const;
