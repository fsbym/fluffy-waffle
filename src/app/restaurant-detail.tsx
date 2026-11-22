"use client";

import { useCallback, useEffect, useState } from "react";
import type { Deal, Proposal, ProposalKind, Restaurant } from "@/lib/types";
import Modal from "./modal";
import { ProposalCard } from "./proposals-panel";

type Props = {
  restaurant: Restaurant;
  /** 数据变化（投票、提交）后递增，用来重新加载这家店的提案 */
  reloadKey: number;
  onClose: () => void;
  onPropose: (kind: ProposalKind, dealId?: number) => void;
  onChanged: () => void;
  onNeedLogin: () => void;
};

const STATUS: Record<Proposal["status"], string> = {
  pending: "待确认", applied: "已生效", rejected: "已驳回", expired: "已过期", cancelled: "已撤销",
};

function mapsSearch(r: Restaurant) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name}, ${r.address}`)}`;
}

function mapsDirections(r: Restaurant) {
  const destination = r.lat !== null && r.lng !== null ? `${r.lat},${r.lng}` : `${r.name}, ${r.address}`;
  return `https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${encodeURIComponent(destination)}`;
}

function osmLink(r: Restaurant) {
  return r.lat !== null && r.lng !== null
    ? `https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=18/${r.lat}/${r.lng}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(r.address)}`;
}

function daysAgo(date: string) {
  const days = Math.floor((Date.now() - new Date(`${date}T12:00:00`).getTime()) / 864e5);
  return days <= 0 ? "今天" : days === 1 ? "昨天" : `${days} 天前`;
}

export default function RestaurantDetail({ restaurant: r, reloadKey, onClose, onPropose, onChanged, onNeedLogin }: Props) {
  const [pending, setPending] = useState<Proposal[] | null>(null);
  const [recent, setRecent] = useState<Proposal[]>([]);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all(
        ["pending", "recent"].map(async (scope) => {
          const response = await fetch(`/api/proposals?scope=${scope}`, { cache: "no-store" });
          if (!response.ok) throw new Error();
          return ((await response.json()) as Proposal[]).filter((p) => p.restaurant_id === r.id);
        }),
      );
      setPending(a);
      setRecent(b);
    } catch {
      setPending([]);
    }
  }, [r.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, reloadKey]);

  const pendingDealIds = new Set((pending ?? []).map((p) => p.deal_id).filter(Boolean));

  async function share() {
    const url = `${window.location.origin}/?r=${r.id}`;
    try {
      if (navigator.share) await navigator.share({ title: r.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // 用户取消分享
    }
  }

  return (
    <Modal title={r.name} onClose={onClose} wide>
      <div className="detail">
        <section className="hero">
          <div className="thumb" style={{ background: r.color }}><span>{r.emoji}</span></div>
          <div className="facts">
            <div className="chips">
              <span className="chip">{r.category}</span>
              {r.rating !== null && <span className="chip star">★ {r.rating.toFixed(1)}</span>}
              {r.price_range && <span className="chip">{r.price_range}</span>}
              {r.walk_minutes !== null && <span className="chip">🚶 距校园约 {r.walk_minutes} 分钟</span>}
            </div>
            <p className="address">📍 {r.address}</p>
            <div className="links">
              <a className="dbtn primary" href={mapsDirections(r)} target="_blank" rel="noopener noreferrer">步行导航</a>
              <a className="dbtn" href={mapsSearch(r)} target="_blank" rel="noopener noreferrer">Google 地图</a>
              <a className="dbtn" href={osmLink(r)} target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
              <button type="button" className="dbtn" onClick={() => void share()}>{copied ? "已复制链接" : "分享"}</button>
            </div>
          </div>
        </section>

        <section>
          <div className="section-head">
            <h3>优惠 <span className="count">{r.deals.length}</span></h3>
            <button type="button" className="dbtn small" onClick={() => onPropose("add_deal")}>＋ 新增优惠</button>
          </div>
          {r.deals.length === 0 && <p className="empty">暂时没有已确认的优惠。知道这家店有什么优惠吗？附张照片提交吧。</p>}
          <ul className="deals">
            {r.deals.map((d) => <DealItem key={d.id} deal={d} hasPending={pendingDealIds.has(d.id)} onPropose={onPropose} />)}
          </ul>
        </section>

        <section>
          <div className="section-head">
            <h3>待确认的变更 {pending && pending.length > 0 && <span className="count">{pending.length}</span>}</h3>
          </div>
          {pending === null && <p className="empty">加载中…</p>}
          {pending?.length === 0 && <p className="empty">这家店目前没有待确认的变更。</p>}
          <div className="stack">
            {pending?.map((p) => <ProposalCard key={p.id} proposal={p} onVoted={() => { void load(); onChanged(); }} onNeedLogin={onNeedLogin} />)}
          </div>
        </section>

        {recent.length > 0 && (
          <section>
            <div className="section-head"><h3>最近 14 天的结果</h3></div>
            <ul className="recent">
              {recent.map((p) => (
                <li key={p.id}>
                  <span className={`status ${p.status}`}>{STATUS[p.status]}</span>
                  <span>{p.claim}</span>
                  <span className="muted">✅ {p.confirms} · ❌ {p.rejects}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <style jsx>{`
        .detail { display: flex; flex-direction: column; gap: 22px; }
        .hero { display: flex; gap: 16px; align-items: flex-start; }
        .thumb { width: 104px; height: 104px; flex: 0 0 104px; display: grid; place-items: center; border-radius: 16px; }
        .thumb span { font-size: 52px; }
        .facts { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 10px; }
        .chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip { padding: 3px 9px; border-radius: 99px; background: #f1efea; color: #59625a; font-size: 12px; }
        .chip.star { background: #fff0e6; color: #c86a3d; font-weight: 700; }
        .address { margin: 0; color: #4a544c; font-size: 14px; }
        .links { display: flex; flex-wrap: wrap; gap: 8px; }
        .dbtn { display: inline-flex; align-items: center; height: 34px; padding: 0 13px; border: 1px solid #dfdfd7; border-radius: 10px; background: #fff; color: #4a544c; font-size: 13px; text-decoration: none; cursor: pointer; }
        .dbtn.primary { border-color: #315f49; background: #315f49; color: #fff; font-weight: 700; }
        .dbtn.small { height: 30px; padding: 0 11px; font-size: 12px; }
        .section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        h3 { margin: 0; font-size: 15px; }
        .count { display: inline-block; min-width: 20px; margin-left: 4px; padding: 0 6px; border-radius: 10px; background: #edf3ee; color: #2f6a4f; font-size: 12px; text-align: center; }
        .empty { margin: 0; color: #8b9288; font-size: 13px; }
        .deals, .recent { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none; }
        .stack { display: flex; flex-direction: column; gap: 10px; }
        .recent li { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 13px; }
        .status { padding: 2px 8px; border-radius: 99px; background: #f1efea; color: #8b9288; font-size: 11px; font-weight: 700; }
        .status.applied { background: #e5f0e5; color: #2f6a4f; }
        .muted { color: #8b9288; font-size: 12px; }
        @media (max-width: 560px) {
          .hero { flex-direction: column; }
          .thumb { width: 100%; height: 96px; }
        }
      `}</style>
    </Modal>
  );
}

function DealItem({ deal: d, hasPending, onPropose }: { deal: Deal; hasPending: boolean; onPropose: (kind: ProposalKind, dealId?: number) => void }) {
  return (
    <li className="deal">
      <div className="main">
        <span className={`kind ${d.kind}`}>{d.kind === "coupon" ? "优惠券" : "折扣"}</span>
        <strong>{d.title}</strong>
      </div>
      <div className="meta">
        {d.ends_on ? `截至 ${d.ends_on}` : "长期有效"}
        {d.source && ` · 来源：${d.source}`}
        {` · ${daysAgo(d.last_verified_on)}确认`}
      </div>
      <div className="deal-actions">
        {hasPending ? (
          <span className="pending">已有待确认的变更，见下方</span>
        ) : (
          <>
            <button type="button" onClick={() => onPropose("update_deal", d.id)}>内容变了</button>
            <button type="button" onClick={() => onPropose("remove_deal", d.id)}>已经取消</button>
          </>
        )}
      </div>
      <style jsx>{`
        .deal { padding: 12px 14px; border: 1px solid #ebe8df; border-radius: 12px; background: #fff; }
        .main { display: flex; gap: 8px; align-items: center; font-size: 14px; }
        .kind { flex: 0 0 auto; padding: 2px 7px; border-radius: 6px; background: #fff0e6; color: #c86a3d; font-size: 11px; font-weight: 700; }
        .kind.coupon { background: #edf3e9; color: #557251; }
        .meta { margin-top: 6px; color: #8b9288; font-size: 12px; }
        .deal-actions { display: flex; gap: 6px; margin-top: 8px; }
        .deal-actions button { height: 28px; padding: 0 10px; border: 1px solid #e2e1d8; border-radius: 8px; background: #fafaf7; color: #59625a; font-size: 12px; cursor: pointer; }
        .deal-actions button:hover { border-color: #b9cbbd; color: #315f49; }
        .pending { color: #c86a3d; font-size: 12px; }
      `}</style>
    </li>
  );
}
