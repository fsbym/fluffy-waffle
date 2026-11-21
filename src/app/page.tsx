"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

type Restaurant = {
  id: number;
  name: string;
  category: string;
  rating: number;
  distance: string;
  address: string;
  price: string;
  discount: string | null;
  coupon: string | null;
  emoji: string;
  color: string;
  accent: string;
};

const categories = ["全部", "套餐", "飲品", "甜點", "便當"];

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}

function MapPinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="10" r="2" fill="currentColor"/></svg>;
}

export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [category, setCategory] = useState("全部");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(1);

  useEffect(() => {
    fetch("/api/restaurants")
      .then((response) => response.json())
      .then((data: Restaurant[]) => setRestaurants(data))
      .catch(() => setRestaurants([]));
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return restaurants.filter((item) =>
      (category === "全部" || item.category === category) &&
      (!normalized || item.name.toLowerCase().includes(normalized) || item.address.toLowerCase().includes(normalized))
    );
  }, [restaurants, category, query]);

  const selected = restaurants.find((item) => item.id === selectedId) ?? filtered[0];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">吃</div>
          <div><strong>校園美食地圖</strong><span>台大主校區</span></div>
        </div>
        <div className="search-wrap">
          <span className="search-icon"><SearchIcon /></span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋店家或美食" aria-label="搜尋店家或美食" />
          <button className="location-button" type="button" aria-label="使用目前位置"><MapPinIcon /></button>
        </div>
        <button className="campus-button" type="button"><span className="campus-dot" />主校區<span className="chevron">⌄</span></button>
      </header>

      <section className="content">
        <aside className="list-panel">
          <div className="list-heading">
            <div><p>附近推薦</p><h1>尋找下一餐</h1></div>
            <span className="result-count">{filtered.length} 家店</span>
          </div>
          <nav className="category-list" aria-label="美食分類">
            {categories.map((item) => (
              <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </nav>
          <div className="restaurant-list">
            {filtered.map((item) => (
              <article key={item.id} className={`restaurant-card ${selectedId === item.id ? "selected" : ""}`} onMouseEnter={() => setSelectedId(item.id)}>
                <button className="card-main" type="button" onClick={() => setSelectedId(item.id)}>
                  <div className="food-thumb" style={{ background: item.color }}><span>{item.emoji}</span></div>
                  <div className="card-info">
                    <div className="name-row"><h2>{item.name}</h2><span className="rating">★ {item.rating.toFixed(1)}</span></div>
                    <p className="meta">{item.category} <span>·</span> {item.price} <span>·</span> {item.distance}</p>
                    {item.discount && <span className="discount-tag">{item.discount}</span>}
                    {item.coupon && <span className="coupon-tag">{item.coupon}</span>}
                  </div>
                </button>
                <a className="map-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`} target="_blank" rel="noopener noreferrer" aria-label={`在 Google 地圖查看 ${item.name}`}><MapPinIcon /></a>
              </article>
            ))}
            {filtered.length === 0 && <div className="empty-state">找不到符合的店家</div>}
          </div>
        </aside>

        <section className="map-panel" aria-label="美食地圖">
          <div className="map-grid" />
          <div className="park park-one" /><div className="park park-two" />
          <div className="road road-one" /><div className="road road-two" /><div className="road road-three" />
          <span className="road-label label-one">新生南路</span><span className="road-label label-two">羅斯福路</span>
          <span className="campus-label">國立臺灣大學</span>
          {filtered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`map-pin ${selectedId === item.id ? "active" : ""}`}
              style={{ left: `${24 + (index % 3) * 23}%`, top: `${28 + (index % 4) * 13}%`, "--pin": item.accent } as CSSProperties}
              onClick={() => setSelectedId(item.id)}
              aria-label={item.name}
            ><span>{item.emoji}</span></button>
          ))}
          {selected && (
            <div className="map-preview">
              <div className="preview-thumb" style={{ background: selected.color }}><span>{selected.emoji}</span></div>
              <div className="preview-info">
                <div className="preview-name"><h3>{selected.name}</h3><span>★ {selected.rating.toFixed(1)}</span></div>
                <p>{selected.address}</p>{selected.discount && <strong>{selected.discount}</strong>}
              </div>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.address)}`} target="_blank" rel="noopener noreferrer" aria-label="開啟 Google 地圖"><span>↗</span></a>
            </div>
          )}
        </section>
      </section>

      <style jsx>{`
        .app-shell { height: 100vh; min-height: 680px; display: flex; flex-direction: column; overflow: hidden; }
        .topbar { height: 82px; flex: 0 0 82px; display: grid; grid-template-columns: 250px minmax(280px, 520px) 250px; justify-content: space-between; align-items: center; gap: 24px; padding: 0 36px; background: #fff; border-bottom: 1px solid #e8e5dc; z-index: 10; }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-mark { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 14px 14px 14px 5px; background: #315f49; color: #fff; font-size: 21px; font-weight: 800; transform: rotate(-3deg); }
        .brand strong, .brand span { display: block; }
        .brand strong { font-size: 17px; letter-spacing: 1px; }
        .brand span { margin-top: 2px; color: #899087; font-size: 12px; }
        .search-wrap { height: 48px; display: flex; align-items: center; gap: 10px; padding: 5px 6px 5px 15px; border: 1px solid #dfdfd7; border-radius: 14px; background: #fafaf7; }
        .search-icon { width: 19px; height: 19px; color: #7d867d; }
        .search-wrap input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: #26352d; font-size: 14px; }
        .search-wrap input::placeholder { color: #a1a69f; }
        .location-button { width: 38px; height: 38px; display: grid; place-items: center; border: 0; border-radius: 10px; background: #e8efe8; color: #416b54; cursor: pointer; }
        .location-button svg { width: 20px; }
        .campus-button { justify-self: end; height: 44px; display: flex; align-items: center; gap: 9px; padding: 0 15px; border: 1px solid #e3e1d8; border-radius: 12px; background: #fff; color: #596259; font-size: 13px; cursor: pointer; }
        .campus-dot { width: 8px; height: 8px; border-radius: 50%; background: #67a27e; box-shadow: 0 0 0 4px #edf4ed; }
        .chevron { margin-left: 4px; color: #9da49b; }
        .content { min-height: 0; flex: 1; display: grid; grid-template-columns: 430px minmax(0, 1fr); }
        .list-panel { min-height: 0; display: flex; flex-direction: column; padding: 28px 24px 20px 36px; background: #fbfaf6; border-right: 1px solid #e5e3da; }
        .list-heading { display: flex; align-items: end; justify-content: space-between; margin-bottom: 18px; }
        .list-heading p { margin: 0 0 4px; color: #8b9288; font-size: 12px; }
        .list-heading h1 { margin: 0; font-size: 23px; line-height: 1.2; }
        .result-count { margin-bottom: 2px; color: #8d948a; font-size: 12px; }
        .category-list { display: flex; gap: 8px; margin-bottom: 16px; }
        .category-list button { height: 34px; padding: 0 13px; border: 1px solid #e2e1d8; border-radius: 17px; background: #fff; color: #737a72; font-size: 12px; cursor: pointer; }
        .category-list button.active { border-color: #315f49; background: #315f49; color: #fff; }
        .restaurant-list { min-height: 0; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; padding-right: 4px; scrollbar-width: thin; }
        .restaurant-card { position: relative; flex: 0 0 112px; display: flex; align-items: stretch; border: 1px solid #ebe8df; border-radius: 14px; background: #fff; transition: border-color .18s, box-shadow .18s; }
        .restaurant-card.selected { border-color: #b9cbbd; box-shadow: 0 8px 24px rgba(47, 106, 79, .09); }
        .card-main { min-width: 0; flex: 1; display: flex; align-items: center; gap: 13px; padding: 10px 42px 10px 10px; border: 0; background: transparent; text-align: left; cursor: pointer; }
        .food-thumb { width: 92px; height: 92px; flex: 0 0 92px; display: grid; place-items: center; overflow: hidden; border-radius: 10px; }
        .food-thumb span { font-size: 44px; filter: drop-shadow(0 5px 5px rgba(70,53,40,.12)); }
        .card-info { min-width: 0; }
        .name-row { display: flex; align-items: center; gap: 8px; }
        .name-row h2 { overflow: hidden; margin: 0; font-size: 15px; white-space: nowrap; text-overflow: ellipsis; }
        .rating { color: #de7a43; font-size: 11px; font-weight: 700; white-space: nowrap; }
        .meta { margin: 6px 0 8px; color: #969b94; font-size: 11px; }
        .meta span { margin: 0 3px; color: #c7c9c3; }
        .discount-tag, .coupon-tag { display: inline-flex; height: 21px; align-items: center; margin-right: 5px; padding: 0 7px; border-radius: 6px; background: #fff0e6; color: #c86a3d; font-size: 10px; font-weight: 700; }
        .coupon-tag { background: #edf3e9; color: #557251; }
        .map-link { position: absolute; right: 10px; top: 10px; width: 30px; height: 30px; display: grid; place-items: center; border: 1px solid #e7e7df; border-radius: 8px; color: #738076; }
        .map-link svg { width: 16px; }
        .empty-state { height: 120px; display: grid; place-items: center; color: #969b94; font-size: 13px; }
        .map-panel { position: relative; overflow: hidden; background: #edf0e7; }
        .map-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(129,145,128,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(129,145,128,.09) 1px, transparent 1px); background-size: 42px 42px; transform: rotate(-8deg) scale(1.15); }
        .park { position: absolute; border-radius: 50%; background: #cadbbd; opacity: .75; }
        .park-one { width: 260px; height: 150px; left: 4%; top: 12%; transform: rotate(20deg); }
        .park-two { width: 180px; height: 220px; right: 8%; bottom: 6%; transform: rotate(-12deg); }
        .road { position: absolute; height: 18px; border: 1px solid #dde1d8; background: #fafbf7; box-shadow: 0 0 0 4px rgba(216,220,209,.35); }
        .road-one { width: 130%; left: -15%; top: 47%; transform: rotate(-8deg); }
        .road-two { width: 120%; height: 14px; left: -10%; top: 65%; transform: rotate(26deg); }
        .road-three { width: 15px; height: 120%; left: 54%; top: -10%; transform: rotate(10deg); }
        .road-label { position: absolute; z-index: 2; color: #a2a99e; font-size: 10px; letter-spacing: 2px; }
        .label-one { left: 10%; top: 44%; transform: rotate(-8deg); }
        .label-two { right: 12%; top: 68%; transform: rotate(26deg); }
        .campus-label { position: absolute; left: 37%; top: 19%; z-index: 2; color: #8b9c86; font-size: 12px; letter-spacing: 3px; }
        .map-pin { --pin: #df7a44; position: absolute; z-index: 4; width: 44px; height: 44px; display: grid; place-items: center; border: 3px solid #fff; border-radius: 50% 50% 50% 8px; background: var(--pin); box-shadow: 0 7px 18px rgba(69,79,67,.18); color: #fff; transform: rotate(-45deg); cursor: pointer; transition: transform .18s, scale .18s; }
        .map-pin span { font-size: 20px; transform: rotate(45deg); }
        .map-pin.active { z-index: 5; scale: 1.12; transform: rotate(-45deg) translate(2px,-2px); box-shadow: 0 10px 24px rgba(69,79,67,.25); }
        .map-preview { position: absolute; z-index: 6; right: 26px; bottom: 24px; width: 330px; height: 112px; display: flex; align-items: center; gap: 12px; padding: 10px; border: 1px solid rgba(58,78,64,.08); border-radius: 15px; background: rgba(255,255,255,.96); box-shadow: 0 14px 38px rgba(72,82,68,.16); backdrop-filter: blur(8px); }
        .preview-thumb { width: 92px; height: 92px; flex: 0 0 92px; display: grid; place-items: center; border-radius: 10px; }
        .preview-thumb span { font-size: 44px; }
        .preview-info { min-width: 0; flex: 1; }
        .preview-name { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .preview-name h3 { overflow: hidden; margin: 0; font-size: 15px; white-space: nowrap; text-overflow: ellipsis; }
        .preview-name span { color: #d97843; font-size: 11px; font-weight: 700; }
        .preview-info p { overflow: hidden; margin: 7px 0; color: #92988f; font-size: 10px; white-space: nowrap; text-overflow: ellipsis; }
        .preview-info strong { display: inline-block; padding: 4px 7px; border-radius: 6px; background: #fff0e6; color: #c86a3d; font-size: 10px; }
        .map-preview > a { width: 32px; height: 32px; flex: 0 0 32px; display: grid; place-items: center; border-radius: 50%; background: #315f49; color: #fff; text-decoration: none; }
        @media (max-width: 900px) {
          .topbar { grid-template-columns: 210px minmax(220px,1fr) auto; padding: 0 20px; }
          .campus-button { width: 44px; overflow: hidden; padding: 0 17px; color: transparent; }
          .campus-dot { flex: 0 0 8px; } .chevron { display: none; }
          .content { grid-template-columns: 380px minmax(0,1fr); }
          .list-panel { padding-left: 20px; }
        }
        @media (max-width: 680px) {
          .app-shell { height: auto; min-height: 100vh; overflow: visible; }
          .topbar { height: auto; min-height: 72px; grid-template-columns: 1fr 44px; gap: 10px; padding: 12px 14px; }
          .brand { grid-column: 1; } .brand-mark { width: 42px; height: 42px; }
          .campus-button { grid-column: 2; grid-row: 1; }
          .search-wrap { grid-column: 1/-1; grid-row: 2; }
          .content { display: flex; flex-direction: column-reverse; }
          .map-panel { height: 340px; flex: 0 0 340px; }
          .list-panel { min-height: 430px; padding: 20px 14px; }
          .restaurant-list { max-height: 520px; }
          .map-preview { right: 12px; bottom: 12px; width: calc(100% - 24px); }
        }
      `}</style>
    </main>
  );
}
