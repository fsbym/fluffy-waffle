"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { verifyLedger, type VerifyResult } from "@/lib/ledger-verify";
import type { LedgerEntry } from "@/lib/types";

type Parsed = { table: string; op: string; actor: string; at: string; row: Record<string, unknown> };

const TABLE: Record<string, string> = { restaurants: "店家", deals: "优惠", proposals: "提案", votes: "投票" };
const OP: Record<string, string> = { insert: "新增", update: "更新", delete: "删除" };
const STATUS: Record<string, string> = { pending: "待确认", applied: "已生效", rejected: "已驳回", expired: "已过期", cancelled: "已撤销" };

function actorLabel(actor: string) {
  if (actor === "seed") return "初始数据";
  if (actor === "admin") return "管理员";
  if (actor.startsWith("proposal:")) return `提案 #${actor.slice(9)} 达成共识`;
  if (actor.startsWith("user:")) return `用户 ${actor.slice(5, 13)}…`;
  return actor;
}

function describe(p: Parsed): string {
  const r = p.row;
  switch (p.table) {
    case "restaurants": return `${r.name}（${r.address}）`;
    case "deals": return `${r.title}${r.is_active === false ? "（已下架）" : ""}`;
    case "proposals": return `#${r.id} ${r.claim} → ${STATUS[String(r.status)] ?? r.status}`;
    case "votes": return `提案 #${r.proposal_id} ${r.stance === "confirm" ? "确认" : "反对"}，证据 ${String(r.evidence_sha256).slice(0, 10)}…`;
    default: return "";
  }
}

async function fetchAll(): Promise<LedgerEntry[]> {
  const all: LedgerEntry[] = [];
  for (let after = 0; ; ) {
    const response = await fetch(`/api/ledger?after=${after}&limit=1000`, { cache: "no-store" });
    if (!response.ok) throw new Error("加载失败");
    const page: LedgerEntry[] = await response.json();
    all.push(...page);
    if (page.length < 1000) return all;
    after = page[page.length - 1].seq;
  }
}

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAll()
      .then(async (all) => { setEntries(all); setResult(await verifyLedger(all)); })
      .catch((err: Error) => setError(err.message));
  }, []);

  const rows = useMemo(() => (entries ?? []).map((e) => ({ e, p: JSON.parse(e.body) as Parsed })).reverse(), [entries]);

  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "ledger.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="ledger">
      <header>
        <div><strong>公开账本</strong><span>店家、优惠、提案、投票的每一次变化</span></div>
        <Link href="/">← 返回地图</Link>
      </header>

      <section className="explain">
        <p>每条记录都带着上一条记录的哈希值（sha256），像链条一样连在一起。只要有人偷偷改了、删了或插入任何一条历史，后面的哈希就全部对不上。你的浏览器刚刚独立重新计算了整条链：</p>
        {error && <p className="bad">{error}</p>}
        {!result && !error && <p className="muted">验证中…</p>}
        {result?.ok && (
          <p className="good">✓ {result.count} 条记录，哈希链完整。最新哈希 <code>{result.head.slice(0, 16)}…</code></p>
        )}
        {result && !result.ok && <p className="bad">✗ 第 {result.seq} 条记录有问题：{result.problem}</p>}
        {entries && (
          <p className="muted">
            想自己验证？<button type="button" onClick={download}>下载完整账本 JSON</button>，对每条计算 <code>sha256(prev_hash + &quot;\n&quot; + body)</code>，应等于 <code>hash</code>，且 <code>prev_hash</code> 等于上一条的 <code>hash</code>（第一条为 64 个 0）。
          </p>
        )}
      </section>

      <ol className="entries">
        {rows.map(({ e, p }) => (
          <li key={e.seq}>
            <span className="seq">#{e.seq}</span>
            <div>
              <div><b>{TABLE[p.table] ?? p.table}{OP[p.op] ?? p.op}</b> · {describe(p)}</div>
              <div className="meta">{actorLabel(p.actor)} · {new Date(p.at).toLocaleString("zh-CN")} · <code title={e.hash}>{e.hash.slice(0, 12)}</code></div>
            </div>
          </li>
        ))}
      </ol>

      <style jsx>{`
        .ledger { max-width: 860px; margin: 0 auto; padding: 24px 20px 60px; }
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
        header strong { display: block; font-size: 20px; }
        header span, .muted { color: #8b9288; font-size: 13px; }
        a, button { color: #315f49; }
        button { padding: 0; border: 0; background: none; font-size: 13px; text-decoration: underline; cursor: pointer; }
        .explain { padding: 16px; border: 1px solid #e6e3da; border-radius: 14px; background: #fff; font-size: 14px; line-height: 1.6; }
        .explain p { margin: 0 0 8px; }
        .good { color: #2f6a4f; font-weight: 700; }
        .bad { color: #b4492a; font-weight: 700; }
        code { padding: 1px 4px; border-radius: 4px; background: #f3f2ee; font-size: 12px; }
        .entries { margin: 18px 0 0; padding: 0; list-style: none; }
        .entries li { display: flex; gap: 12px; padding: 10px 4px; border-bottom: 1px solid #ecebe5; font-size: 13px; }
        .seq { flex: 0 0 48px; color: #a1a69f; font-variant-numeric: tabular-nums; }
        .meta { margin-top: 3px; color: #8b9288; font-size: 12px; }
      `}</style>
    </main>
  );
}
