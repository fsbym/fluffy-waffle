"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import type { Restaurant } from "@/lib/types";

/** 校园中心：King's College Circle */
const CAMPUS: [number, number] = [43.661753, -79.395178];

type Props = {
  restaurants: Restaurant[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * OpenStreetMap 地图（Leaflet + OpenStreetMap 瓦片）。
 * Leaflet 只能在浏览器里运行，所以在 effect 里动态加载。
 */
export default function MapView({ restaurants, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef(new Map<number, Marker>());
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const fittedFor = useRef<string>("");

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // 初始化地图（只做一次）
  useEffect(() => {
    let cancelled = false;
    const markers = markersRef.current;
    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true }).setView(CAMPUS, 15);
      L.control.zoom({ position: "topright" }).addTo(map);
      // OpenStreetMap 官方瓦片：免费、无需 key，要求注明出处，适合小流量网站。
      // 流量大了以后可以换成 MapTiler / Stadia 等有免费额度的瓦片服务。
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 贡献者',
      }).addTo(map);
      L.marker(CAMPUS, {
        icon: L.divIcon({ className: "campus-marker", html: "<span>🎓 多大</span>", iconSize: [64, 26], iconAnchor: [32, 13] }),
        keyboard: false,
        zIndexOffset: -100,
      }).addTo(map);
      mapRef.current = map;
      setReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markers.clear();
    };
  }, []);

  // 同步店家图钉
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    const markers = markersRef.current;
    const visible = restaurants.filter((r) => r.lat !== null && r.lng !== null);
    const keep = new Set(visible.map((r) => r.id));
    for (const [id, marker] of markers) {
      if (!keep.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
    for (const r of visible) {
      const html = `<div class="pin${r.id === selectedId ? " active" : ""}"><span>${escapeHtml(r.emoji)}</span></div>`;
      const icon = L.divIcon({ className: "pin-wrap", html, iconSize: [40, 40], iconAnchor: [20, 40] });
      let marker = markers.get(r.id);
      if (!marker) {
        marker = L.marker([r.lat!, r.lng!], { icon, title: r.name, alt: r.name, riseOnHover: true })
          .on("click", () => onSelectRef.current(r.id))
          .addTo(map);
        markers.set(r.id, marker);
      } else {
        marker.setIcon(icon).setLatLng([r.lat!, r.lng!]);
      }
      marker.setZIndexOffset(r.id === selectedId ? 1000 : 0);
    }

    // 筛选结果变化时，把视野调整到能看到所有店家
    const key = visible.map((r) => r.id).join(",");
    if (key && key !== fittedFor.current) {
      fittedFor.current = key;
      const bounds = L.latLngBounds([CAMPUS, ...visible.map((r) => [r.lat!, r.lng!] as [number, number])]);
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
    }
  }, [ready, restaurants, selectedId]);

  // 选中的店家如果在视野外，平移过去
  useEffect(() => {
    const map = mapRef.current;
    const r = restaurants.find((x) => x.id === selectedId);
    if (!ready || !map || !r || r.lat === null || r.lng === null) return;
    if (!map.getBounds().pad(-0.15).contains([r.lat, r.lng])) map.panTo([r.lat, r.lng]);
  }, [ready, restaurants, selectedId]);

  function locate() {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const here: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        L.circleMarker(here, { radius: 7, color: "#fff", weight: 2, fillColor: "#2b7de9", fillOpacity: 1 }).addTo(map);
        map.setView(here, 16);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="map-view">
      <div ref={containerRef} className="map-canvas" aria-label="美食地图" />
      <button type="button" className="locate" onClick={locate} disabled={locating} aria-label="显示我的位置">
        {locating ? "定位中…" : "📍 我的位置"}
      </button>
      <style jsx>{`
        .map-view { position: absolute; inset: 0; }
        .map-canvas { position: absolute; inset: 0; background: var(--surface-2); }
        .locate { position: absolute; z-index: 500; top: 12px; left: 12px; height: 34px; padding: 0 12px; border: 1px solid rgba(0,0,0,.08); border-radius: 10px; background: #fff; color: var(--brand-text); font-size: 12px; font-weight: 700; box-shadow: 0 4px 12px rgba(var(--shadow), .12); cursor: pointer; }
        .map-view :global(.leaflet-container) { font-family: inherit; }
        /* 降低 OSM 默认配色的饱和度，让橙红图钉更醒目 */
        .map-view :global(.leaflet-tile-pane) { filter: saturate(.12) brightness(1.06) contrast(.92); }
        .map-view :global(.leaflet-control-attribution) { font-size: 10px; }
        .map-view :global(.pin-wrap) { background: none; border: 0; }
        .map-view :global(.pin) { width: 40px; height: 40px; display: grid; place-items: center; border: 3px solid #fff; border-radius: 50% 50% 50% 6px; background: var(--brand); box-shadow: 0 6px 16px rgba(var(--shadow), .25); transform: rotate(-45deg); transition: transform .15s; }
        .map-view :global(.pin span) { font-size: 18px; transform: rotate(45deg); }
        .map-view :global(.pin.active) { background: var(--accent); border-color: var(--ink); transform: rotate(-45deg) scale(1.18); box-shadow: 0 10px 24px rgba(var(--shadow), .35); }
        .map-view :global(.campus-marker) { background: none; border: 0; }
        .map-view :global(.campus-marker span) { display: inline-block; padding: 4px 8px; border-radius: 13px; background: var(--ink); color: var(--accent); font-size: 12px; font-weight: 700; white-space: nowrap; box-shadow: 0 4px 10px rgba(var(--shadow), .2); }
      `}</style>
    </div>
  );
}
