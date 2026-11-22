"use client";

import { useState, type FormEvent } from "react";
import { CATEGORIES, CONFIRM_THRESHOLD, type ProposalKind, type Restaurant } from "@/lib/types";
import { useAuth } from "./auth";
import Modal from "./modal";
import PhotoInput from "./photo-input";

type Props = {
  restaurants: Restaurant[];
  restaurantId: number | null;
  onClose: () => void;
  onSubmitted: () => void;
};

const ACTIONS: { kind: ProposalKind; label: string }[] = [
  { kind: "add_deal", label: "新增优惠" },
  { kind: "update_deal", label: "优惠变了" },
  { kind: "remove_deal", label: "优惠取消了" },
  { kind: "add_restaurant", label: "新店家" },
];

export default function ProposalDialog({ restaurants, restaurantId, onClose, onSubmitted }: Props) {
  const { authFetch } = useAuth();
  const [kind, setKind] = useState<ProposalKind>("add_deal");
  const [rid, setRid] = useState(restaurantId ?? restaurants[0]?.id ?? 0);
  const restaurant = restaurants.find((r) => r.id === rid);
  const deals = restaurant?.deals ?? [];
  const [dealId, setDealId] = useState<number | null>(deals[0]?.id ?? null);
  const deal = deals.find((d) => d.id === dealId) ?? deals[0];
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ status: string; reason: string } | null>(null);

  const needsDeal = kind === "update_deal" || kind === "remove_deal";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photo) { setError("请附上一张照片"); return; }
    const form = new FormData(event.currentTarget);
    form.set("kind", kind);
    if (kind === "add_deal") form.set("restaurant_id", String(rid));
    if (needsDeal && deal) form.set("deal_id", String(deal.id));
    form.set("photo", photo, "evidence.jpg");
    setBusy(true);
    setError(null);
    try {
      const response = await authFetch("/api/proposals", { method: "POST", body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "提交失败，请稍后再试");
      setDone({ status: body.status, reason: body.ai_reason });
      onSubmitted();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Modal title="已提交" onClose={onClose}>
        <div className="stack">
          <p className="success">
            {done.status === "applied"
              ? "已经生效！"
              : `你的照片已通过检查，算作第 1 票。再有 ${CONFIRM_THRESHOLD - 1} 位同学附照片确认，就会自动更新到地图上。`}
          </p>
          {done.reason && <p className="hint">AI 看到的：{done.reason}</p>}
          <div className="actions"><button type="button" className="primary" onClick={onClose}>好的</button></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="提交优惠信息" onClose={onClose}>
      <form onSubmit={submit}>
        <p className="hint">由大家共同维护：你提交后，再有 {CONFIRM_THRESHOLD - 1} 位同学附照片确认就会生效。每张照片都会先经过 AI 检查。</p>

        <div className="choices" role="radiogroup" aria-label="要做什么">
          {ACTIONS.map((a) => (
            <label key={a.kind}>
              <input type="radio" name="action" checked={kind === a.kind} onChange={() => setKind(a.kind)} /> {a.label}
            </label>
          ))}
        </div>

        {kind !== "add_restaurant" && (
          <label>店家
            <select value={rid} onChange={(e) => { const next = Number(e.target.value); setRid(next); setDealId(restaurants.find((r) => r.id === next)?.deals[0]?.id ?? null); }}>
              {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
        )}

        {needsDeal && (deals.length === 0 ? (
          <p className="error">这家店目前没有优惠，可以选「新增优惠」。</p>
        ) : (
          <label>哪条优惠
            <select value={deal?.id} onChange={(e) => setDealId(Number(e.target.value))}>
              {deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </label>
        ))}

        {kind === "add_restaurant" && (
          <>
            <label>店名<input name="name" required maxLength={80} placeholder="例如：Banh Mi Boys" /></label>
            <label>地址<input name="address" required maxLength={160} placeholder="例如：392 Queen St W, Toronto, ON" /></label>
            <div className="row">
              <label>分类
                <select name="category" defaultValue={CATEGORIES[0]}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
              </label>
              <label>价位（可不填）<input name="price_range" maxLength={30} placeholder="$10-20" /></label>
            </div>
          </>
        )}

        {(kind === "add_deal" || kind === "update_deal") && (
          <>
            <div className="row">
              <label>类型
                <select name="deal_kind" key={`${kind}-${deal?.id}`} defaultValue={kind === "update_deal" ? deal?.kind : "discount"}>
                  <option value="discount">折扣</option>
                  <option value="coupon">优惠券 / 饭团券</option>
                </select>
              </label>
              <label>截止日期（可不填）<input name="ends_on" type="date" key={`end-${kind}-${deal?.id}`} defaultValue={kind === "update_deal" ? deal?.ends_on ?? "" : ""} /></label>
            </div>
            <label>{kind === "update_deal" ? "现在的优惠内容" : "优惠内容"}
              <input name="title" required maxLength={120} key={`title-${kind}-${deal?.id}`} defaultValue={kind === "update_deal" ? deal?.title : ""} placeholder="例如：出示学生卡 9 折" />
            </label>
            {kind === "add_deal" && <label>来源（可不填）<input name="source" maxLength={40} placeholder="店内告示 / 饭团 / Instagram…" /></label>}
          </>
        )}

        <PhotoInput onChange={setPhoto} />

        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          <button type="button" onClick={onClose}>取消</button>
          <button type="submit" className="primary" disabled={busy || (needsDeal && deals.length === 0)}>
            {busy ? "AI 检查照片中…" : "提交"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
