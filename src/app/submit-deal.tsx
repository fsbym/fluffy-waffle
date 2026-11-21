"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { DealKind, Restaurant } from "@/lib/types";

type Props = {
  restaurants: Restaurant[];
  defaultRestaurantId: number | null;
  onClose: () => void;
};

const OTHER = "other";

export default function SubmitDealDialog({ restaurants, defaultRestaurantId, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [restaurantChoice, setRestaurantChoice] = useState(defaultRestaurantId ? String(defaultRestaurantId) : OTHER);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const known = restaurants.find((item) => String(item.id) === restaurantChoice);
    const payload = {
      restaurant_id: known?.id ?? null,
      restaurant_name: known?.name ?? String(form.get("restaurant_name") ?? ""),
      kind: form.get("kind") as DealKind,
      title: form.get("title"),
      source: form.get("source"),
      ends_on: form.get("ends_on"),
      note: form.get("note"),
      website: form.get("website"),
    };
    setStatus("sending");
    setError(null);
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "提交失败，请稍后再试");
      }
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败，请稍后再试");
      setStatus("idle");
    }
  }

  return (
    <dialog ref={dialogRef} className="dialog" onClose={onClose} aria-labelledby="submit-title">
      {status === "done" ? (
        <div className="done">
          <h2 id="submit-title">谢谢！</h2>
          <p>管理员审核通过后，这条优惠就会出现在地图上。</p>
          <button type="button" className="primary" onClick={onClose}>好的</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <h2 id="submit-title">提交一条优惠</h2>
          <p className="hint">发现了学生折扣、饭团券或店家活动？告诉大家吧。</p>

          <label>
            店家
            <select value={restaurantChoice} onChange={(event) => setRestaurantChoice(event.target.value)}>
              {restaurants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              <option value={OTHER}>其他店家（手动填写）</option>
            </select>
          </label>
          {restaurantChoice === OTHER && (
            <label>
              店名和地址
              <input name="restaurant_name" required maxLength={80} placeholder="例如：Banh Mi Boys, 392 Queen St W" />
            </label>
          )}

          <fieldset>
            <legend>类型</legend>
            <label className="inline"><input type="radio" name="kind" value="discount" defaultChecked /> 折扣</label>
            <label className="inline"><input type="radio" name="kind" value="coupon" /> 优惠券 / 饭团券</label>
          </fieldset>

          <label>
            优惠内容
            <input name="title" required maxLength={120} placeholder="例如：出示学生卡 9 折" />
          </label>
          <div className="row">
            <label>
              来源
              <input name="source" maxLength={40} placeholder="店内告示 / 饭团 / Instagram…" />
            </label>
            <label>
              截止日期（可不填）
              <input name="ends_on" type="date" />
            </label>
          </div>
          <label>
            备注（可不填）
            <textarea name="note" maxLength={500} rows={2} placeholder="使用条件、时段等" />
          </label>
          <input name="website" className="trap" tabIndex={-1} autoComplete="off" aria-hidden="true" />

          {error && <p className="error" role="alert">{error}</p>}
          <div className="actions">
            <button type="button" onClick={onClose}>取消</button>
            <button type="submit" className="primary" disabled={status === "sending"}>{status === "sending" ? "提交中…" : "提交"}</button>
          </div>
        </form>
      )}

      <style jsx>{`
        .dialog { width: min(460px, calc(100vw - 28px)); max-height: calc(100dvh - 28px); margin: auto; padding: 0; border: 0; border-radius: 18px; background: #fff; color: #1f2a25; box-shadow: 0 24px 60px rgba(40, 50, 40, .25); }
        .dialog::backdrop { background: rgba(31, 42, 37, .35); }
        form, .done { display: flex; flex-direction: column; gap: 12px; padding: 22px; }
        h2 { margin: 0; font-size: 18px; }
        .hint, .done p { margin: -4px 0 4px; color: #7d867d; font-size: 13px; }
        label { display: flex; flex-direction: column; gap: 5px; color: #59625a; font-size: 12px; }
        input, select, textarea { padding: 9px 11px; border: 1px solid #dfdfd7; border-radius: 10px; background: #fafaf7; color: #1f2a25; font-size: 14px; }
        input:focus, select:focus, textarea:focus { outline: 2px solid #b9cbbd; border-color: #315f49; }
        fieldset { display: flex; gap: 16px; margin: 0; padding: 0; border: 0; color: #59625a; font-size: 12px; }
        legend { margin-bottom: 6px; }
        .inline { flex-direction: row; align-items: center; gap: 6px; font-size: 13px; color: #1f2a25; }
        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .trap { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
        .error { margin: 0; color: #b4492a; font-size: 13px; }
        .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
        button { height: 38px; padding: 0 16px; border: 1px solid #dfdfd7; border-radius: 10px; background: #fff; color: #596259; font-size: 13px; cursor: pointer; }
        .primary { border-color: #315f49; background: #315f49; color: #fff; font-weight: 700; }
        .primary:disabled { opacity: .6; cursor: default; }
        .done .primary { align-self: flex-end; }
        @media (max-width: 480px) { .row { grid-template-columns: 1fr; } }
      `}</style>
    </dialog>
  );
}
