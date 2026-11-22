"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CATEGORIES, THRESHOLDS, type Deal, type Proposal, type Restaurant } from "@/lib/types";

async function api<T = unknown>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const response = await fetch(path, {
    ...rest,
    cache: "no-store",
    headers: json === undefined ? rest.headers : { "Content-Type": "application/json", ...rest.headers },
    body: json === undefined ? rest.body : JSON.stringify(json),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `请求失败（${response.status}）`);
  return body as T;
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date());
}

function formObject(form: HTMLFormElement): Record<string, string> {
  return Object.fromEntries([...new FormData(form).entries()].map(([key, value]) => [key, String(value)]));
}

function dealState(deal: Deal): { label: string; tone: "on" | "off" | "warn" } {
  const now = today();
  if (!deal.is_active) return { label: "已停用", tone: "off" };
  if (deal.ends_on && deal.ends_on < now) return { label: "已过期", tone: "off" };
  if (deal.starts_on && deal.starts_on > now) return { label: "未开始", tone: "warn" };
  return { label: "生效中", tone: "on" };
}

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ loggedIn: boolean }>("/api/admin/login")
      .then((body) => setLoggedIn(body.loggedIn))
      .catch(() => setLoggedIn(false));
  }, []);

  if (loggedIn === null) return <Shell><p className="muted">加载中…</p></Shell>;
  if (!loggedIn) return <Shell><Login onDone={() => setLoggedIn(true)} /></Shell>;
  return (
    <Shell onLogout={async () => { await api("/api/admin/login", { method: "DELETE" }); setLoggedIn(false); }}>
      <Dashboard />
    </Shell>
  );
}

function Shell({ children, onLogout }: { children: ReactNode; onLogout?: () => void }) {
  return (
    <main className="admin">
      <header>
        <div><strong>管理后台</strong><span>校园美食地图</span></div>
        <nav>
          <Link href="/">← 返回地图</Link>
          {onLogout && <button type="button" onClick={onLogout}>退出登录</button>}
        </nav>
      </header>
      {children}
      <style jsx global>{`
        .admin { max-width: 980px; margin: 0 auto; padding: 24px 20px 60px; }
        .admin header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .admin header strong { display: block; font-size: 20px; }
        .admin header span, .admin .muted { color: #8b9288; font-size: 13px; }
        .admin header nav { display: flex; gap: 12px; align-items: center; font-size: 13px; }
        .admin a { color: #315f49; }
        .admin button { height: 34px; padding: 0 13px; border: 1px solid #dfdfd7; border-radius: 9px; background: #fff; color: #4a544c; font-size: 13px; cursor: pointer; }
        .admin button.primary { border-color: #315f49; background: #315f49; color: #fff; font-weight: 700; }
        .admin button.danger { color: #b4492a; }
        .admin button:disabled { opacity: .55; cursor: default; }
        .admin input, .admin select { height: 34px; padding: 0 10px; border: 1px solid #dfdfd7; border-radius: 9px; background: #fff; font-size: 13px; min-width: 0; }
        .admin label { display: flex; flex-direction: column; gap: 4px; color: #6b736c; font-size: 12px; }
        .admin .card { margin-bottom: 14px; padding: 16px; border: 1px solid #e6e3da; border-radius: 14px; background: #fff; }
        .admin .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; align-items: end; }
        .admin .tabs { display: flex; gap: 8px; margin-bottom: 18px; }
        .admin .tabs button.active { border-color: #315f49; background: #315f49; color: #fff; }
        .admin .error { color: #b4492a; font-size: 13px; }
        .admin .rhead { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .admin .rhead h3 { margin: 0; font-size: 16px; }
        .admin .rhead .meta { color: #8b9288; font-size: 12px; }
        .admin .actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .admin table { width: 100%; margin-top: 12px; border-collapse: collapse; font-size: 13px; }
        .admin td, .admin th { padding: 7px 6px; border-top: 1px solid #f0eee8; text-align: left; vertical-align: middle; }
        .admin th { color: #8b9288; font-weight: 500; font-size: 12px; }
        .admin .pill { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 700; white-space: nowrap; }
        .admin .pill.on { background: #e5f0e5; color: #2f6a4f; }
        .admin .pill.off { background: #f1efea; color: #8b9288; }
        .admin .pill.warn { background: #fff0e6; color: #c86a3d; }
        .admin form.inline-form { display: grid; grid-template-columns: 110px 1fr 120px 140px auto; gap: 8px; margin-top: 10px; align-items: end; }
        @media (max-width: 720px) { .admin form.inline-form { grid-template-columns: 1fr 1fr; } }
      `}</style>
    </main>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/login", { method: "POST", json: formObject(event.currentTarget) });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} style={{ maxWidth: 360 }}>
      <label>管理员密码<input name="password" type="password" required autoFocus /></label>
      {error && <p className="error">{error}</p>}
      <button className="primary" type="submit" disabled={busy} style={{ marginTop: 12 }}>登录</button>
    </form>
  );
}

function Dashboard() {
  const [tab, setTab] = useState<"restaurants" | "proposals">("restaurants");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([
        api<Restaurant[]>("/api/admin/restaurants"),
        api<Proposal[]>("/api/proposals"),
      ]);
      setRestaurants(r);
      setProposals(s);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  /** 执行一次修改，成功后重新加载；失败时显示错误。 */
  const run = useCallback(async (action: () => Promise<unknown>) => {
    try {
      await action();
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }, [reload]);

  return (
    <>
      <div className="tabs">
        <button type="button" className={tab === "restaurants" ? "active" : ""} onClick={() => setTab("restaurants")}>店家与优惠（{restaurants.length}）</button>
        <button type="button" className={tab === "proposals" ? "active" : ""} onClick={() => setTab("proposals")}>待确认提案（{proposals.length}）</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {tab === "restaurants" ? (
        <>
          <NewRestaurant run={run} />
          {restaurants.map((r) => <RestaurantCard key={r.id} restaurant={r} run={run} />)}
        </>
      ) : (
        <>
          <p className="muted">提案由同学们投票决定（新增优惠提交即生效，取消优惠 2 人、修改优惠和新增店家 3 人附照片确认），不需要管理员审核。这里只用来撤销违规内容（例如照片不当、恶意刷票），撤销操作同样会记入公开账本。</p>
          {proposals.length === 0 && <p className="muted">暂时没有待确认的提案。</p>}
          {proposals.map((p) => <ProposalRow key={p.id} proposal={p} run={run} />)}
        </>
      )}
    </>
  );
}

type Run = (action: () => Promise<unknown>) => Promise<void>;

function RestaurantFields({ r }: { r?: Restaurant }) {
  return (
    <div className="grid">
      <label>店名<input name="name" required defaultValue={r?.name} /></label>
      <label>分类
        <input name="category" required list="categories" defaultValue={r?.category} />
      </label>
      <label style={{ gridColumn: "span 2" }}>地址<input name="address" required defaultValue={r?.address} /></label>
      <label>价位<input name="price_range" placeholder="$10-20" defaultValue={r?.price_range ?? ""} /></label>
      <label>步行分钟<input name="walk_minutes" type="number" min={0} max={120} defaultValue={r?.walk_minutes ?? ""} /></label>
      <label>评分<input name="rating" type="number" min={0} max={5} step={0.1} defaultValue={r?.rating ?? ""} /></label>
      <label>纬度 lat<input name="lat" type="number" step="any" min={-90} max={90} defaultValue={r?.lat ?? ""} placeholder="43.66" /></label>
      <label>经度 lng<input name="lng" type="number" step="any" min={-180} max={180} defaultValue={r?.lng ?? ""} placeholder="-79.40" /></label>
      <label>图标<input name="emoji" defaultValue={r?.emoji ?? "🍽️"} /></label>
      <label>底色<input name="color" type="color" defaultValue={r?.color ?? "#e7dfcf"} /></label>
      <label>强调色<input name="accent" type="color" defaultValue={r?.accent ?? "#df7a44"} /></label>
      <datalist id="categories">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
    </div>
  );
}

function NewRestaurant({ run }: { run: Run }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" className="primary" onClick={() => setOpen(true)} style={{ marginBottom: 14 }}>＋ 新增店家</button>;
  return (
    <form
      className="card"
      onSubmit={(event) => {
        event.preventDefault();
        const body = formObject(event.currentTarget);
        void run(async () => { await api("/api/admin/restaurants", { method: "POST", json: body }); setOpen(false); });
      }}
    >
      <RestaurantFields />
      <div className="actions" style={{ marginTop: 12 }}>
        <button className="primary" type="submit">保存</button>
        <button type="button" onClick={() => setOpen(false)}>取消</button>
      </div>
    </form>
  );
}

function RestaurantCard({ restaurant: r, run }: { restaurant: Restaurant; run: Run }) {
  const [editing, setEditing] = useState(false);

  return (
    <section className="card">
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const body = formObject(event.currentTarget);
            void run(async () => { await api(`/api/admin/restaurants/${r.id}`, { method: "PATCH", json: body }); setEditing(false); });
          }}
        >
          <RestaurantFields r={r} />
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="primary" type="submit">保存</button>
            <button type="button" onClick={() => setEditing(false)}>取消</button>
          </div>
        </form>
      ) : (
        <div className="rhead">
          <div>
            <h3>{r.emoji} {r.name}</h3>
            <span className="meta">{[r.category, r.address, r.price_range].filter(Boolean).join(" · ")}</span>
          </div>
          <div className="actions">
            <button type="button" onClick={() => setEditing(true)}>编辑店家</button>
            <button
              type="button"
              className="danger"
              onClick={() => { if (confirm(`删除「${r.name}」和它的所有优惠？`)) void run(() => api(`/api/admin/restaurants/${r.id}`, { method: "DELETE" })); }}
            >删除</button>
          </div>
        </div>
      )}

      {r.deals.length > 0 && (
        <table>
          <thead><tr><th>状态</th><th>优惠</th><th>来源</th><th>有效期</th><th>上次确认</th><th /></tr></thead>
          <tbody>{r.deals.map((d) => <DealRow key={d.id} deal={d} run={run} />)}</tbody>
        </table>
      )}

      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const body = { ...formObject(form), restaurant_id: r.id };
          void run(async () => { await api("/api/admin/deals", { method: "POST", json: body }); form.reset(); });
        }}
      >
        <label>类型<select name="kind"><option value="discount">折扣</option><option value="coupon">优惠券</option></select></label>
        <label>新增优惠<input name="title" required maxLength={120} placeholder="例如：学生 9 折" /></label>
        <label>来源<input name="source" maxLength={40} placeholder="店家 / 饭团" /></label>
        <label>截止日期<input name="ends_on" type="date" /></label>
        <button type="submit" className="primary">添加</button>
      </form>
    </section>
  );
}

function DealRow({ deal, run }: { deal: Deal; run: Run }) {
  const [editing, setEditing] = useState(false);
  const state = dealState(deal);
  const patch = (json: Record<string, unknown>) => run(() => api(`/api/admin/deals/${deal.id}`, { method: "PATCH", json }));

  if (editing) {
    return (
      <tr>
        <td colSpan={6}>
          <form
            className="inline-form"
            style={{ marginTop: 0 }}
            onSubmit={(event) => {
              event.preventDefault();
              const body = formObject(event.currentTarget);
              void patch({ ...body, ends_on: body.ends_on || null, source: body.source || null }).then(() => setEditing(false));
            }}
          >
            <label>类型<select name="kind" defaultValue={deal.kind}><option value="discount">折扣</option><option value="coupon">优惠券</option></select></label>
            <label>优惠<input name="title" required maxLength={120} defaultValue={deal.title} /></label>
            <label>来源<input name="source" maxLength={40} defaultValue={deal.source ?? ""} /></label>
            <label>截止日期<input name="ends_on" type="date" defaultValue={deal.ends_on ?? ""} /></label>
            <div className="actions"><button className="primary" type="submit">保存</button><button type="button" onClick={() => setEditing(false)}>取消</button></div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td><span className={`pill ${state.tone}`}>{state.label}</span></td>
      <td>{deal.kind === "coupon" ? "🎟️ " : "🏷️ "}{deal.title}</td>
      <td>{deal.source ?? "—"}</td>
      <td>{deal.starts_on || deal.ends_on ? `${deal.starts_on ?? ""} ~ ${deal.ends_on ?? ""}` : "长期"}</td>
      <td>{deal.last_verified_on}</td>
      <td>
        <div className="actions">
          <button type="button" onClick={() => void patch({ last_verified_on: today() })} title="确认这条优惠今天仍然有效">今天确认过</button>
          <button type="button" onClick={() => void patch({ is_active: !deal.is_active })}>{deal.is_active ? "停用" : "启用"}</button>
          <button type="button" onClick={() => setEditing(true)}>编辑</button>
          <button type="button" className="danger" onClick={() => { if (confirm("删除这条优惠？")) void run(() => api(`/api/admin/deals/${deal.id}`, { method: "DELETE" })); }}>删除</button>
        </div>
      </td>
    </tr>
  );
}

function ProposalRow({ proposal: p, run }: { proposal: Proposal; run: Run }) {
  return (
    <section className="card">
      <div className="rhead">
        <div>
          <h3>{p.claim}</h3>
          <span className="meta">确认 {p.confirms}/{THRESHOLDS[p.kind]} · 反对 {p.rejects} · 提交于 {new Date(p.created_at).toLocaleString("zh-CN")}</span>
          <div className="actions" style={{ marginTop: 8 }}>
            {p.votes.map((v) => (
              <a key={v.id} href={`/api/evidence/${v.id}`} target="_blank" rel="noopener noreferrer">{v.voter} {v.stance === "confirm" ? "确认" : "反对"}的照片</a>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="danger"
          onClick={() => { if (confirm("撤销这个提案？")) void run(() => api(`/api/admin/proposals/${p.id}`, { method: "PATCH", json: { action: "cancel" } })); }}
        >撤销</button>
      </div>
    </section>
  );
}
