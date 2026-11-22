"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { THRESHOLDS, type Proposal, type Stance, type Vote } from "@/lib/types";
import { useAuth } from "./auth";
import Modal from "./modal";
import PhotoInput from "./photo-input";

const VERDICT: Record<Vote["ai_verdict"], string> = {
  supports: "AI：照片支持主张",
  contradicts: "AI：照片与主张矛盾",
  unclear: "AI：相关但看不清",
  unchecked: "",
};

const STATUS: Record<Proposal["status"], string> = {
  pending: "待确认", applied: "已生效", rejected: "已驳回", expired: "已过期", cancelled: "已撤销",
};

function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5));
}

type Props = { onClose: () => void; onChanged: () => void; onNeedLogin: () => void };

export default function ProposalsPanel({ onClose, onChanged, onNeedLogin }: Props) {
  const [scope, setScope] = useState<"pending" | "recent">("pending");
  const [items, setItems] = useState<Proposal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/proposals?scope=${scope}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setItems(await response.json());
      setError(null);
    } catch {
      setError("加载失败，请稍后再试");
    }
  }, [scope]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <Modal title="大家提交的变更" onClose={onClose} wide>
      <div className="stack">
        <p className="hint">取消优惠需要 {THRESHOLDS.remove_deal} 位同学、修改优惠和新增店家需要 {THRESHOLDS.update_deal} 位同学附照片确认（且确认多于反对）才会生效；同样人数反对则驳回；14 天没结果自动过期。新增优惠提交即生效。所有记录都写进公开账本。</p>
        <div className="tabs">
          <button type="button" className={scope === "pending" ? "on" : ""} onClick={() => { setItems(null); setScope("pending"); }}>待确认</button>
          <button type="button" className={scope === "recent" ? "on" : ""} onClick={() => { setItems(null); setScope("recent"); }}>最近结果</button>
        </div>
        {error && <p className="error">{error}</p>}
        {!items && !error && <p className="hint">加载中…</p>}
        {items?.length === 0 && <p className="hint">{scope === "pending" ? "暂时没有待确认的变更。" : "最近 14 天没有结束的变更。"}</p>}
        {items?.map((p) => (
          <ProposalCard key={p.id} proposal={p} onVoted={() => { void load(); onChanged(); }} onNeedLogin={onNeedLogin} />
        ))}
      </div>
      <style jsx>{`
        .tabs { display: flex; gap: 8px; }
        .tabs button { height: 32px; padding: 0 14px; border: 1px solid #e2e1d8; border-radius: 16px; background: #fff; color: #737a72; font-size: 12px; cursor: pointer; }
        .tabs button.on { border-color: #315f49; background: #315f49; color: #fff; }
      `}</style>
    </Modal>
  );
}

export function ProposalCard({ proposal: p, onVoted, onNeedLogin }: { proposal: Proposal; onVoted: () => void; onNeedLogin: () => void }) {
  const { email } = useAuth();
  const [voting, setVoting] = useState<Stance | null>(null);
  const threshold = THRESHOLDS[p.kind];
  const progress = Math.min(100, (p.confirms / threshold) * 100);

  return (
    <article className="card">
      <div className="top">
        <strong>{p.claim}</strong>
        <span className={`status ${p.status}`}>{STATUS[p.status]}</span>
      </div>
      <div className="bar" aria-label={`确认 ${p.confirms} / ${threshold}`}><span style={{ width: `${progress}%` }} /></div>
      <p className="count">
        ✅ 确认 {p.confirms}/{threshold} · ❌ 反对 {p.rejects}
        {p.status === "pending" && ` · 还剩 ${daysLeft(p.expires_at)} 天`}
      </p>

      <ul className="votes">
        {p.votes.map((v) => (
          <li key={v.id}>
            <a href={`/api/evidence/${v.id}`} target="_blank" rel="noopener noreferrer" className="thumb" aria-label={`查看 ${v.voter} 的照片`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/evidence/${v.id}`} alt="" loading="lazy" />
            </a>
            <div>
              <b>{v.voter}</b> {v.stance === "confirm" ? "确认" : "反对"}
              {VERDICT[v.ai_verdict] && <span className="ai">{VERDICT[v.ai_verdict]}{v.ai_reason ? `：${v.ai_reason}` : ""}</span>}
            </div>
          </li>
        ))}
      </ul>

      {p.status === "pending" && !voting && (
        <div className="vote-actions">
          <button type="button" className="btn primary" onClick={() => (email ? setVoting("confirm") : onNeedLogin())}>我也确认（附照片）</button>
          <button type="button" className="btn" onClick={() => (email ? setVoting("reject") : onNeedLogin())}>我看到的不一样</button>
        </div>
      )}
      {voting && <VoteForm proposalId={p.id} stance={voting} onCancel={() => setVoting(null)} onDone={() => { setVoting(null); onVoted(); }} />}

      <style jsx>{`
        .card { padding: 14px; border: 1px solid #ebe8df; border-radius: 14px; background: #fff; }
        .top { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; font-size: 14px; line-height: 1.5; }
        .status { flex: 0 0 auto; padding: 2px 8px; border-radius: 99px; background: #fff0e6; color: #c86a3d; font-size: 11px; font-weight: 700; }
        .status.applied { background: #e5f0e5; color: #2f6a4f; }
        .status.rejected, .status.expired, .status.cancelled { background: #f1efea; color: #8b9288; }
        .bar { height: 6px; margin-top: 10px; overflow: hidden; border-radius: 3px; background: #eef0ea; }
        .bar span { display: block; height: 100%; background: #4f8a68; }
        .count { margin: 6px 0 0; color: #7d867d; font-size: 12px; }
        .votes { display: flex; flex-direction: column; gap: 8px; margin: 12px 0 0; padding: 0; list-style: none; }
        .votes li { display: flex; gap: 10px; align-items: center; font-size: 13px; }
        .thumb { width: 52px; height: 52px; flex: 0 0 52px; overflow: hidden; border-radius: 8px; background: #f1efea; }
        .thumb img { width: 100%; height: 100%; object-fit: cover; }
        .ai { display: block; margin-top: 2px; color: #8b9288; font-size: 12px; }
        .vote-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
      `}</style>
    </article>
  );
}

function VoteForm({ proposalId, stance, onCancel, onDone }: { proposalId: number; stance: Stance; onCancel: () => void; onDone: () => void }) {
  const { authFetch } = useAuth();
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photo) { setError("请附上一张照片"); return; }
    const form = new FormData();
    form.set("stance", stance);
    form.set("photo", photo, "evidence.jpg");
    setBusy(true);
    setError(null);
    try {
      const response = await authFetch(`/api/proposals/${proposalId}/votes`, { method: "POST", body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "提交失败，请稍后再试");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 12 }}>
      <PhotoInput onChange={setPhoto} label={stance === "confirm" ? "你拍到的证据" : "你看到的情况（照片）"} />
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button type="button" onClick={onCancel}>取消</button>
        <button type="submit" className="primary" disabled={busy}>{busy ? "上传中…" : stance === "confirm" ? "确认" : "反对"}</button>
      </div>
    </form>
  );
}
