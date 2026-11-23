"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatPrice, type Deal, type ProposalKind, type Restaurant } from "@/lib/types";
import { useAuth } from "./auth";
import AccountDialog from "./account-dialog";
import LoginDialog from "./login-dialog";
import ProposalDialog from "./proposal-dialog";
import MapView from "./map-view";
import ProposalsPanel from "./proposals-panel";
import RestaurantDetail from "./restaurant-detail";

const mapsUrl = (item: Pick<Restaurant, "name" | "address">) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.name}, ${item.address}`)}`;

function dealLabel(deal: Deal) {
  return deal.ends_on ? `${deal.title}（至 ${deal.ends_on.slice(5).replace("-", "/")}）` : deal.title;
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}

function MapPinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="10" r="2" fill="currentColor"/></svg>;
}

type LoadState = "loading" | "ready" | "error";

export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [category, setCategory] = useState("全部");
  const [query, setQuery] = useState("");
  const [dealsOnly, setDealsOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<null | "login" | "account" | "propose" | "proposals">(null);
  const [proposeFor, setProposeFor] = useState<{ restaurantId: number | null; kind?: ProposalKind; dealId?: number; dishId?: number }>({ restaurantId: null });
  const [detailId, setDetailId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const { email, recovering } = useAuth();

  // 从「忘记密码」邮件回来：直接打开设置新密码
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (recovering) setDialog("account");
  }, [recovering]);

  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      const response = await fetch("/api/restaurants", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      setRestaurants(await response.json());
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, []);

  const loadPending = useCallback(async () => {
    try {
      const response = await fetch("/api/proposals", { cache: "no-store" });
      if (response.ok) setPendingCount((await response.json()).length);
    } catch {
      // 待确认数量只是提示，失败就不显示
    }
  }, []);

  const refresh = useCallback(() => {
    void load();
    void loadPending();
    setReloadKey((k) => k + 1);
  }, [load, loadPending]);

  /** 打开 / 关闭店家详情，并把店号写进网址（?r=店号），方便分享 */
  const openDetail = useCallback((id: number | null) => {
    setDetailId(id);
    if (id !== null) setSelectedId(id);
    const url = new URL(window.location.href);
    if (id === null) url.searchParams.delete("r");
    else url.searchParams.set("r", String(id));
    window.history.replaceState(null, "", url);
  }, []);

  // 打开分享链接时，直接显示那家店
  useEffect(() => {
    if (loadState !== "ready") return;
    const id = Number(new URLSearchParams(window.location.search).get("r"));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (id && restaurants.some((r) => r.id === id)) openDetail(id);
    // 只在首次加载完成时检查一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadState]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPending();
  }, [loadPending]);

  /** 需要登录的操作：没登录先弹登录框 */
  const propose = (restaurantId: number | null, kind?: ProposalKind, target: { dealId?: number; dishId?: number } = {}) => {
    if (!email) { setDialog("login"); return; }
    setProposeFor({ restaurantId, kind, ...target });
    setDialog("propose");
  };

  useEffect(() => {
    // 首次加载时从后端读取店家与折扣数据
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const categories = useMemo(() => ["全部", ...new Set(restaurants.map((item) => item.category))], [restaurants]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return restaurants.filter((item) =>
      (category === "全部" || item.category === category) &&
      (!dealsOnly || item.deals.length > 0) &&
      (!normalized ||
        item.name.toLowerCase().includes(normalized) ||
        item.address.toLowerCase().includes(normalized) ||
        item.category.toLowerCase().includes(normalized) ||
        item.dishes.some((dish) => dish.name.toLowerCase().includes(normalized)) ||
        item.deals.some((deal) => deal.title.toLowerCase().includes(normalized)))
    );
  }, [restaurants, category, query, dealsOnly]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">吃</div>
          <div><strong>UTSG 简餐食堂指北</strong><span>多大 St. George 校区</span></div>
        </div>
        <div className="search-wrap">
          <span className="search-icon"><SearchIcon /></span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索店名、菜名、分类或优惠" aria-label="搜索店名、菜名、分类或优惠" />
        </div>
        <div className="top-actions">
          <button className="ghost-button" type="button" onClick={() => setDialog("proposals")}>
            待确认{pendingCount ? <span className="badge">{pendingCount}</span> : null}
          </button>
          <button className="submit-button header-submit" type="button" onClick={() => propose(selected?.id ?? null)}>＋ 推荐</button>
          {email ? (
            <button className="ghost-button account" type="button" onClick={() => setDialog("account")} title={`已登录：${email}`}>账号</button>
          ) : (
            <button className="ghost-button" type="button" onClick={() => setDialog("login")}>登录</button>
          )}
        </div>
      </header>

      <section className="content">
        <aside className="list-panel">
          <div className="list-heading">
            <div><p>附近推荐</p><h1>寻找下一餐</h1></div>
            <span className="result-count">{filtered.length} 家店</span>
          </div>
          <nav className="category-list" aria-label="美食分类">
            {categories.map((item) => (
              <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
            ))}
            <button type="button" className={dealsOnly ? "active" : ""} onClick={() => setDealsOnly((value) => !value)} aria-pressed={dealsOnly}>有优惠</button>
          </nav>
          <div className="restaurant-list">
            {loadState === "loading" && <div className="empty-state">加载中…</div>}
            {loadState === "error" && (
              <div className="empty-state">加载失败 <button type="button" className="retry" onClick={() => void load()}>重试</button></div>
            )}
            {loadState === "ready" && filtered.map((item) => (
              <article key={item.id} className={`restaurant-card ${selected?.id === item.id ? "selected" : ""}`} onMouseEnter={() => setSelectedId(item.id)}>
                <button className="card-main" type="button" onClick={() => openDetail(item.id)} aria-label={`查看 ${item.name} 的详情`}>
                  <div className="food-thumb"><span>{item.emoji}</span></div>
                  <div className="card-info">
                    <div className="name-row"><h2>{item.name}</h2>{item.rating !== null && <span className="rating">★ {item.rating.toFixed(1)}</span>}</div>
                    <p className="meta">
                      {[item.category, item.price_range, item.walk_minutes !== null ? `距校园步行约 ${item.walk_minutes} 分钟` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {item.dishes.length > 0 && (
                      <p className="dishes">
                        {item.dishes.slice(0, 3).map((dish) => (
                          <span key={dish.id}>{dish.name} <b>{formatPrice(dish.price)}</b></span>
                        ))}
                        {item.dishes.length > 3 && <span className="more">等 {item.dishes.length} 道</span>}
                      </p>
                    )}
                    <div className="tags">
                      {item.deals.map((deal) => (
                        <span key={deal.id} className={deal.kind === "coupon" ? "coupon-tag" : "discount-tag"} title={deal.source ? `来源：${deal.source}，${deal.last_verified_on} 确认` : undefined}>
                          {dealLabel(deal)}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
                <span className="more-hint" aria-hidden="true">详情 ›</span>
                <a className="map-link" href={mapsUrl(item)} target="_blank" rel="noopener noreferrer" aria-label={`在 Google 地图查看 ${item.name}`}><MapPinIcon /></a>
              </article>
            ))}
            {loadState === "ready" && restaurants.length === 0 && (
              <div className="empty-state first">
                <p>地图上还没有店家。</p>
                <p>知道校园附近哪家简餐、食堂好吃？附张照片，添加第一家吧。</p>
                <button type="button" className="submit-button" onClick={() => propose(null, "add_restaurant")}>＋ 添加第一家店</button>
              </div>
            )}
            {loadState === "ready" && restaurants.length > 0 && filtered.length === 0 && <div className="empty-state">没有找到符合的店家</div>}
          </div>
          <p className="data-note">店家、推荐菜和优惠都由同学们共同维护，附照片提交即生效；删除一道菜或一条优惠需要 2 人确认。价格均为税前。所有改动都记录在<Link href="/ledger">公开账本</Link>里。</p>
        </aside>

        <section className="map-panel" aria-label="美食地图">
          <MapView restaurants={filtered} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
          {selected && (
            <div className="map-preview" role="button" tabIndex={0} onClick={() => openDetail(selected.id)} onKeyDown={(e) => { if (e.key === "Enter") openDetail(selected.id); }} aria-label={`查看 ${selected.name} 的详情`}>
              <div className="preview-thumb"><span>{selected.emoji}</span></div>
              <div className="preview-info">
                <div className="preview-name"><h3>{selected.name}</h3>{selected.rating !== null && <span>★ {selected.rating.toFixed(1)}</span>}</div>
                <p>{selected.address}</p>
                {selected.dishes[0] ? (
                  <strong className="dish-chip">{selected.dishes[0].name} {formatPrice(selected.dishes[0].price)}</strong>
                ) : selected.deals[0] ? <strong>{dealLabel(selected.deals[0])}</strong> : null}
              </div>
              <span className="preview-more" aria-hidden="true">›</span>
            </div>
          )}
        </section>
      </section>

      {/* 手机上「推荐」按钮固定在右下角，顶栏放不下 */}
      <button className="fab" type="button" onClick={() => propose(selected?.id ?? null)} aria-label="推荐店家、菜或优惠">＋ 推荐</button>

      {detailId !== null && restaurants.find((r) => r.id === detailId) && (
        <RestaurantDetail
          restaurant={restaurants.find((r) => r.id === detailId)!}
          reloadKey={reloadKey}
          onClose={() => openDetail(null)}
          onPropose={(kind, target) => propose(detailId, kind, target)}
          onChanged={refresh}
          onNeedLogin={() => setDialog("login")}
        />
      )}
      {dialog === "login" && <LoginDialog onClose={() => setDialog(null)} />}
      {dialog === "account" && email && <AccountDialog onClose={() => setDialog(null)} />}
      {dialog === "propose" && (
        <ProposalDialog
          restaurants={restaurants}
          restaurantId={proposeFor.restaurantId}
          initialKind={proposeFor.kind}
          initialDealId={proposeFor.dealId}
          initialDishId={proposeFor.dishId}
          onClose={() => setDialog(null)}
          onSubmitted={refresh}
        />
      )}
      {dialog === "proposals" && (
        <ProposalsPanel onClose={() => setDialog(null)} onChanged={refresh} onNeedLogin={() => setDialog("login")} />
      )}

      <style jsx>{`
        .app-shell { height: 100vh; min-height: 680px; display: flex; flex-direction: column; overflow: hidden; }
        .topbar { height: 82px; flex: 0 0 82px; display: grid; grid-template-columns: 250px minmax(240px, 480px) auto; justify-content: space-between; align-items: center; gap: 24px; padding: 0 36px; background: #fff; border-bottom: 1px solid var(--line); z-index: 10; }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-mark { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 14px 14px 14px 5px; background: var(--brand); color: #fff; font-size: 21px; font-weight: 800; transform: rotate(-3deg); box-shadow: 3px 3px 0 var(--accent); }
        .brand strong, .brand span { display: block; }
        .brand strong { font-size: 17px; letter-spacing: 1px; }
        .brand span { margin-top: 2px; color: var(--muted); font-size: 12px; }
        .search-wrap { height: 48px; display: flex; align-items: center; gap: 10px; padding: 5px 6px 5px 15px; border: 1px solid var(--line); border-radius: 14px; background: var(--bg); }
        .search-icon { width: 19px; height: 19px; flex: 0 0 19px; color: var(--muted); }
        .search-wrap { padding-right: 15px; }
        .search-wrap input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: var(--ink); font-size: 14px; }
        .search-wrap input::placeholder { color: var(--muted); }
        .top-actions { justify-self: end; display: flex; align-items: center; gap: 8px; }
        .ghost-button { height: 44px; display: inline-flex; align-items: center; gap: 6px; padding: 0 14px; border: 1px solid var(--line); border-radius: 12px; background: #fff; color: var(--ink-2); font-size: 13px; cursor: pointer; white-space: nowrap; }
        .ghost-button:hover { border-color: var(--brand); }
        .badge { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: var(--accent); color: var(--ink); font-size: 11px; font-weight: 800; line-height: 18px; text-align: center; }
        .more-hint { position: absolute; right: 14px; bottom: 12px; color: var(--muted); font-size: 11px; pointer-events: none; }
        .restaurant-card:hover .more-hint { color: var(--brand-text); }
        .preview-more { flex: 0 0 auto; color: var(--brand); font-size: 26px; padding: 0 6px; }
        .map-preview { cursor: pointer; }
        .map-preview:hover { box-shadow: 0 16px 42px rgba(var(--shadow), .24); }
        .data-note :global(a) { color: var(--brand-text); font-weight: 700; }
        .submit-button { height: 44px; padding: 0 16px; border: 0; border-radius: 12px; background: var(--brand); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .submit-button:hover { background: var(--brand-dark); }
        .brand > div { min-width: 0; }
        .fab { display: none; }
        .content { min-height: 0; flex: 1; display: grid; grid-template-columns: 430px minmax(0, 1fr); }
        .list-panel { min-height: 0; display: flex; flex-direction: column; padding: 28px 24px 20px 36px; background: var(--bg); border-right: 1px solid var(--line); }
        .list-heading { display: flex; align-items: end; justify-content: space-between; margin-bottom: 18px; }
        .list-heading p { margin: 0 0 4px; color: var(--muted); font-size: 12px; }
        .list-heading h1 { margin: 0; font-size: 23px; line-height: 1.2; }
        .result-count { margin-bottom: 2px; color: var(--muted); font-size: 12px; }
        .category-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
        .category-list button { height: 34px; padding: 0 13px; border: 1px solid var(--line); border-radius: 17px; background: #fff; color: var(--muted); font-size: 12px; cursor: pointer; }
        .category-list button.active { border-color: var(--brand); background: var(--brand); color: #fff; }
        .data-note { margin: 10px 0 0; color: var(--muted); font-size: 11px; }
        .retry { margin-left: 8px; border: 0; background: none; color: var(--brand-text); text-decoration: underline; cursor: pointer; }
        .restaurant-list { min-height: 0; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; padding-right: 4px; scrollbar-width: thin; }
        .restaurant-card { position: relative; flex: 0 0 auto; min-height: 112px; display: flex; align-items: stretch; border: 1px solid var(--line); border-radius: 14px; background: #fff; transition: border-color .18s, box-shadow .18s; }
        .restaurant-card.selected { border-color: var(--brand); box-shadow: 0 8px 24px rgba(var(--shadow), .09); }
        .card-main { min-width: 0; flex: 1; display: flex; align-items: center; gap: 13px; padding: 10px 42px 30px 10px; border: 0; background: transparent; text-align: left; cursor: pointer; }
        .food-thumb { width: 92px; height: 92px; flex: 0 0 92px; display: grid; place-items: center; overflow: hidden; border-radius: 10px;  background: var(--accent-soft); }
        .food-thumb span { font-size: 44px; filter: drop-shadow(0 5px 5px rgba(var(--shadow), .12)); }
        .card-info { min-width: 0; }
        .name-row { display: flex; align-items: center; gap: 8px; }
        .name-row h2 { overflow: hidden; margin: 0; font-size: 15px; white-space: nowrap; text-overflow: ellipsis; }
        .rating { color: var(--brand-text); font-size: 11px; font-weight: 700; white-space: nowrap; }
        .meta { margin: 6px 0 8px; color: var(--muted); font-size: 11px; }
        .meta span { margin: 0 3px; color: var(--line-strong); }
        .tags { display: flex; flex-wrap: wrap; gap: 5px; }
        .dishes { display: flex; flex-wrap: wrap; gap: 4px 10px; margin: 0 0 8px; color: var(--ink-2); font-size: 12px; }
        .dishes b { color: var(--brand-text); font-weight: 700; }
        .dishes .more { color: var(--muted); }
        .preview-info strong.dish-chip { background: var(--surface-2); color: var(--ink-2); }
        .discount-tag, .coupon-tag { display: inline-flex; min-height: 21px; align-items: center; padding: 0 7px; border-radius: 6px; background: var(--brand-soft); color: var(--brand-text); font-size: 10px; font-weight: 700; }
        .coupon-tag { background: var(--accent-soft); color: var(--ink); }
        .map-link { position: absolute; right: 10px; top: 10px; width: 30px; height: 30px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 8px; color: var(--muted); }
        .map-link svg { width: 16px; }
        .empty-state { height: 120px; display: grid; place-items: center; color: var(--muted); font-size: 13px; }
        .empty-state.first { height: auto; gap: 6px; padding: 32px 12px; text-align: center; line-height: 1.6; }
        .empty-state.first p { margin: 0; }
        .empty-state.first button { margin-top: 10px; }
        .map-panel { position: relative; overflow: hidden; background: var(--surface-2); }
        .map-preview { position: absolute; z-index: 600; right: 26px; bottom: 24px; width: 330px; height: 112px; display: flex; align-items: center; gap: 12px; padding: 10px; border: 1px solid rgba(var(--shadow), .08); border-radius: 15px; background: rgba(255,255,255,.96); box-shadow: 0 14px 38px rgba(var(--shadow), .16); backdrop-filter: blur(8px); }
        .preview-thumb { width: 92px; height: 92px; flex: 0 0 92px; display: grid; place-items: center; border-radius: 10px;  background: var(--accent-soft); }
        .preview-thumb span { font-size: 44px; }
        .preview-info { min-width: 0; flex: 1; }
        .preview-name { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .preview-name h3 { overflow: hidden; margin: 0; font-size: 15px; white-space: nowrap; text-overflow: ellipsis; }
        .preview-name span { color: var(--brand-text); font-size: 11px; font-weight: 700; }
        .preview-info p { overflow: hidden; margin: 7px 0; color: var(--muted); font-size: 10px; white-space: nowrap; text-overflow: ellipsis; }
        .preview-info strong { display: inline-block; padding: 4px 7px; border-radius: 6px; background: var(--brand-soft); color: var(--brand-text); font-size: 10px; }
        @media (max-width: 900px) {
          .topbar { grid-template-columns: 210px minmax(220px,1fr) auto; padding: 0 20px; }
          .content { grid-template-columns: 380px minmax(0,1fr); }
          .list-panel { padding-left: 20px; }
        }
        @media (max-width: 680px) {
          .app-shell { height: auto; min-height: 100vh; overflow: visible; }
          .topbar { flex: none; height: auto; min-height: 72px; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; padding: 12px 14px; }
          .brand { grid-column: 1; min-width: 0; gap: 8px; } .brand-mark { width: 38px; height: 38px; flex: 0 0 38px; font-size: 18px; }
          .brand span { display: none; } .brand strong { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .top-actions { grid-column: 2; grid-row: 1; gap: 6px; }
          .top-actions .ghost-button { height: 36px; padding: 0 10px; font-size: 12px; }
          .header-submit { display: none; }
          .fab { position: fixed; z-index: 1100; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom)); display: inline-flex; align-items: center; height: 50px; padding: 0 20px; border: 0; border-radius: 25px; background: var(--brand); color: #fff; font-size: 15px; font-weight: 700; box-shadow: 0 10px 24px rgba(var(--shadow), .35); cursor: pointer; }
          .fab:active { transform: scale(.97); }
          .search-wrap { grid-column: 1/-1; grid-row: 2; }
          .content { display: flex; flex-direction: column-reverse; }
          .map-panel { height: 420px; flex: 0 0 420px; }
          .list-panel { min-height: 430px; padding: 20px 14px 96px; } /* 底部留出悬浮按钮的位置 */
          .restaurant-list { max-height: none; overflow: visible; }
          .map-preview { right: 12px; bottom: 24px; width: calc(100% - 24px); height: 84px; }
          .preview-thumb { width: 64px; height: 64px; flex-basis: 64px; } .preview-thumb span { font-size: 32px; }
        }
      `}</style>
    </main>
  );
}
