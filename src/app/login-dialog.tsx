"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "./auth";
import Modal from "./modal";

export default function LoginDialog({ onClose }: { onClose: () => void }) {
  const { signIn, configured } = useAuth();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setBusy(true);
    setError(null);
    try {
      await signIn(email);
      setSentTo(email);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="登录" onClose={onClose}>
      {!configured ? (
        <p className="error">登录功能还没有配置（缺少 Supabase 公开配置）。</p>
      ) : sentTo ? (
        <div className="stack">
          <p className="success">登录链接已发送到 <b>{sentTo}</b>，打开邮件点链接就能登录。</p>
          <p className="hint">没收到的话看看垃圾邮件箱。</p>
          <div className="actions"><button type="button" className="primary" onClick={onClose}>好的</button></div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <p className="hint">登录后可以提交和确认优惠。不需要密码，我们会给你的邮箱发一个登录链接；任何邮箱都可以。</p>
          <label>邮箱<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" autoFocus /></label>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="actions">
            <button type="button" onClick={onClose}>取消</button>
            <button type="submit" className="primary" disabled={busy}>{busy ? "发送中…" : "发送登录链接"}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
