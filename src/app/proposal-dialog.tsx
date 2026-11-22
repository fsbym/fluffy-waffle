"use client";

import { useState, type FormEvent } from "react";
import { formatPrice, THRESHOLDS, type ProposalKind, type Restaurant } from "@/lib/types";
import { useAuth } from "./auth";
import Modal from "./modal";
import PhotoInput from "./photo-input";

type Props = {
  restaurants: Restaurant[];
  restaurantId: number | null;
  /** 打开时预先选好的操作和对象（从店家详情里点按钮时使用） */
  initialKind?: ProposalKind;
  initialDealId?: number | null;
  initialDishId?: number | null;
  onClose: () => void;
  onSubmitted: () => void;
};

const GROUPS: { label: string; actions: { kind: ProposalKind; label: string }[] }[] = [
  { label: "店家", actions: [{ kind: "add_restaurant", label: "新店家" }] },
  {
    label: "推荐菜",
    actions: [
      { kind: "add_dish", label: "推荐一道菜" },
      { kind: "update_dish", label: "价格 / 菜名变了" },
      { kind: "remove_dish", label: "这道菜没了" },
    ],
  },
  {
    label: "优惠",
    actions: [
      { kind: "add_deal", label: "新增优惠" },
      { kind: "update_deal", label: "优惠变了" },
      { kind: "remove_deal", label: "优惠取消了" },
    ],
  },
];

const TITLES: Record<ProposalKind, string> = {
  add_restaurant: "添加一家店",
  add_dish: "推荐一道菜",
  update_dish: "更新推荐菜",
  remove_dish: "这道菜没了",
  add_deal: "新增优惠",
  update_deal: "优惠变了",
  remove_deal: "优惠取消了",
};

export default function ProposalDialog({ restaurants, restaurantId, initialKind, initialDealId = null, initialDishId = null, onClose, onSubmitted }: Props) {
  const { authFetch } = useAuth();
  const [kind, setKind] = useState<ProposalKind>(initialKind ?? (restaurants.length ? "add_dish" : "add_restaurant"));
  const [rid, setRid] = useState(restaurantId ?? restaurants[0]?.id ?? 0);
  const restaurant = restaurants.find((r) => r.id === rid);
  const deals = restaurant?.deals ?? [];
  const dishes = restaurant?.dishes ?? [];
  const [dealId, setDealId] = useState<number | null>(initialDealId ?? deals[0]?.id ?? null);
  const [dishId, setDishId] = useState<number | null>(initialDishId ?? dishes[0]?.id ?? null);
  const deal = deals.find((d) => d.id === dealId) ?? deals[0];
  const dish = dishes.find((d) => d.id === dishId) ?? dishes[0];
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ status: string; reason: string } | null>(null);

  const needsDeal = kind === "update_deal" || kind === "remove_deal";
  const needsDish = kind === "update_dish" || kind === "remove_dish";
  const missingTarget = (needsDeal && deals.length === 0) || (needsDish && dishes.length === 0);
  const isDishPhoto = kind === "add_dish" || kind === "update_dish" || kind === "remove_dish" || kind === "add_restaurant";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photo) { setError("请附上一张照片"); return; }
    const form = new FormData(event.currentTarget);
    form.set("kind", kind);
    if (kind === "add_deal" || kind === "add_dish") form.set("restaurant_id", String(rid));
    if (needsDeal && deal) form.set("deal_id", String(deal.id));
    if (needsDish && dish) form.set("dish_id", String(dish.id));
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
              ? "已经生效，谢谢分享！"
              : `已收到，你的照片算作第 1 票。再有 ${THRESHOLDS[kind] - 1} 位同学附照片确认，就会自动更新。`}
          </p>
          {done.reason && <p className="hint">AI 看到的：{done.reason}</p>}
          <div className="actions"><button type="button" className="primary" onClick={onClose}>好的</button></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={TITLES[kind]} onClose={onClose}>
      <form onSubmit={submit}>
        <p className="hint">
          {THRESHOLDS[kind] === 1
            ? "附上照片提交后立即生效。"
            : `你提交后，再有 ${THRESHOLDS[kind] - 1} 位同学附照片确认就会生效。`}
          照片会公开给大家查看。
        </p>

        <div className="groups" role="radiogroup" aria-label="要做什么">
          {GROUPS.filter((g) => restaurants.length > 0 || g.label === "店家").map((g) => (
            <div key={g.label} className="group">
              <span className="group-label">{g.label}</span>
              <div className="choices">
                {g.actions.map((a) => (
                  <label key={a.kind}>
                    <input type="radio" name="action" checked={kind === a.kind} onChange={() => setKind(a.kind)} /> {a.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {kind !== "add_restaurant" && (
          <label>店家
            <select
              value={rid}
              onChange={(e) => {
                const next = restaurants.find((r) => r.id === Number(e.target.value));
                setRid(Number(e.target.value));
                setDealId(next?.deals[0]?.id ?? null);
                setDishId(next?.dishes[0]?.id ?? null);
              }}
            >
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

        {needsDish && (dishes.length === 0 ? (
          <p className="error">这家店还没有推荐菜，可以选「推荐一道菜」。</p>
        ) : (
          <label>哪道菜
            <select value={dish?.id} onChange={(e) => setDishId(Number(e.target.value))}>
              {dishes.map((d) => <option key={d.id} value={d.id}>{d.name}（{formatPrice(d.price)}）</option>)}
            </select>
          </label>
        ))}

        {kind === "add_restaurant" && (
          <>
            <label>店名<input name="name" required maxLength={80} placeholder="店名（英文名或中文名都可以）" /></label>
            <label>地址（会自动在地图上定位）<input name="address" required maxLength={160} placeholder="门牌号 + 街道名，例如 100 St George St" /></label>
            <div className="row">
              <label>分类
                <input name="category" required maxLength={20} list="known-categories" placeholder="例如：食堂、拉面、奶茶" />
                <datalist id="known-categories">{[...new Set(restaurants.map((r) => r.category))].map((c) => <option key={c} value={c} />)}</datalist>
              </label>
              <label>人均（可不填）<input name="price_range" maxLength={30} placeholder="$10-15" /></label>
            </div>
            <label>图标（可不填，一个 emoji）<input name="emoji" maxLength={8} placeholder="🍜" /></label>
            <fieldset className="sub">
              <legend>顺便推荐一道菜（可不填）</legend>
              <div className="row">
                <label>菜名<input name="dish_name" maxLength={60} placeholder="你觉得好吃的菜" /></label>
                <label>税前价格（$）<input name="dish_price" type="number" inputMode="decimal" min="0.01" max="999.99" step="0.01" placeholder="12.99" /></label>
              </div>
              <label>为什么推荐<input name="dish_note" maxLength={120} placeholder="例如：份量大，汤底香" /></label>
            </fieldset>
          </>
        )}

        {(kind === "add_dish" || (kind === "update_dish" && dish)) && (
          <>
            <div className="row">
              <label>菜名
                <input name="name" required maxLength={60} key={`dn-${kind}-${dish?.id}`} defaultValue={kind === "update_dish" ? dish?.name : ""} placeholder="你觉得好吃的菜" />
              </label>
              <label>税前价格（$）
                <input name="price" required type="number" inputMode="decimal" min="0.01" max="999.99" step="0.01" key={`dp-${kind}-${dish?.id}`} defaultValue={kind === "update_dish" ? dish?.price.toFixed(2) : ""} placeholder="12.99" />
              </label>
            </div>
            <label>为什么推荐（可不填）
              <input name="note" maxLength={120} key={`dnote-${kind}-${dish?.id}`} defaultValue={kind === "update_dish" ? dish?.note ?? "" : ""} placeholder="例如：份量大，汤底香" />
            </label>
          </>
        )}

        {(kind === "add_deal" || (kind === "update_deal" && deal)) && (
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

        <PhotoInput
          onChange={setPhoto}
          hint={isDishPhoto ? "必填：菜的照片、菜单或收据" : "必填：店内告示、菜单、收据或 App 截图"}
        />

        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          <button type="button" onClick={onClose}>取消</button>
          <button type="submit" className="primary" disabled={busy || missingTarget}>
            {busy ? "上传中…" : "提交"}
          </button>
        </div>
      </form>
      <style jsx>{`
        .groups { display: flex; flex-direction: column; gap: 8px; }
        .group { display: grid; grid-template-columns: 52px 1fr; gap: 8px; align-items: center; }
        .group-label { color: var(--muted); font-size: 12px; }
        .sub { display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 12px; border: 1px dashed var(--line); border-radius: 12px; }
        .sub legend { padding: 0 4px; color: var(--ink-2); font-size: 12px; }
        @media (max-width: 480px) { .group { grid-template-columns: 1fr; gap: 4px; } }
      `}</style>
    </Modal>
  );
}
