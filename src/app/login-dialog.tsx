"use client";

import { useState, type FormEvent } from "react";
import { PASSWORD_MIN_LENGTH, useAuth } from "./auth";
import Modal from "./modal";

type Tab = "link" | "password";
type PasswordMode = "login" | "register" | "forgot";

/**
 * 两种登录方式：
 * - 邮件链接：不需要密码，收邮件点链接。
 * - 密码：适合学校 / 公司邮箱——这类邮箱会自动预先打开邮件里的链接，导致登录链接失效。
 */
export default function LoginDialog({ onClose }: { onClose: () => void }) {
  const { configured } = useAuth();
  const [tab, setTab] = useState<Tab>("link");

  return (
    <Modal title="登录" onClose={onClose}>
      {!configured ? (
        <p className="error">登录功能还没有配置（缺少 Supabase 公开配置）。</p>
      ) : (
        <div className="stack">
          <div className="tabs" role="tablist" aria-label="登录方式">
            <button type="button" role="tab" aria-selected={tab === "link"} className={tab === "link" ? "on" : ""} onClick={() => setTab("link")}>邮件链接</button>
            <button type="button" role="tab" aria-selected={tab === "password"} className={tab === "password" ? "on" : ""} onClick={() => setTab("password")}>密码</button>
          </div>
          {tab === "link" ? <LinkLogin onClose={onClose} onUsePassword={() => setTab("password")} /> : <PasswordLogin onClose={onClose} />}
        </div>
      )}
      <style jsx>{`
        .tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 12px; background: var(--surface-2); }
        .tabs button { height: 34px; border: 0; border-radius: 9px; background: transparent; color: var(--ink-2); font-size: 13px; cursor: pointer; }
        .tabs button.on { background: var(--surface); color: var(--ink); font-weight: 700; box-shadow: 0 1px 4px rgba(var(--shadow), .12); }
      `}</style>
    </Modal>
  );
}

function LinkLogin({ onClose, onUsePassword }: { onClose: () => void; onUsePassword: () => void }) {
  const { signIn } = useAuth();
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

  if (sentTo) {
    return (
      <div className="stack">
        <p className="success">登录链接已发送到 <b>{sentTo}</b>，打开邮件点链接就能登录。</p>
        <p className="hint">没收到的话看看垃圾邮件箱。学校或公司邮箱有时会自动预先打开邮件里的链接，导致链接失效——遇到这种情况，请改用<button type="button" className="link" onClick={onUsePassword}>密码登录</button>。</p>
        <div className="actions"><button type="button" className="primary" onClick={onClose}>好的</button></div>
        <style jsx>{`.link { padding: 0; border: 0; background: none; color: var(--brand-text); font: inherit; font-weight: 700; text-decoration: underline; cursor: pointer; }`}</style>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <p className="hint">不需要密码：填邮箱，我们给你发一个登录链接。任何邮箱都可以。</p>
      <label>邮箱<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" autoFocus /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button type="button" onClick={onClose}>取消</button>
        <button type="submit" className="primary" disabled={busy}>{busy ? "发送中…" : "发送登录链接"}</button>
      </div>
    </form>
  );
}

function PasswordLogin({ onClose }: { onClose: () => void }) {
  const { signInWithPassword, signUp, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<PasswordMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: PasswordMode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (mode === "register" && password !== confirm) { setError("两次输入的密码不一样。"); return; }
    setBusy(true);
    try {
      if (mode === "login") {
        await signInWithPassword(email.trim(), password);
        onClose();
        return;
      }
      if (mode === "register") {
        const { needsConfirmation } = await signUp(email.trim(), password);
        if (!needsConfirmation) { onClose(); return; }
        setNotice(`注册成功！我们给 ${email.trim()} 发了一封确认邮件，点里面的链接确认邮箱后，就能用密码登录了。（学校邮箱有时会自动帮你确认，可以直接试试登录。）`);
        setMode("login");
        setPassword("");
        setConfirm("");
      }
      if (mode === "forgot") {
        await sendPasswordReset(email.trim());
        setNotice(`重置密码的邮件已发送到 ${email.trim()}，点里面的链接后会回到这里设置新密码。`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const title = { login: "用密码登录", register: "注册账号", forgot: "忘记密码" }[mode];

  return (
    <form onSubmit={submit}>
      <p className="hint">
        {mode === "login" && "用邮箱和密码登录。学校邮箱的登录链接总是失效？用这个就好。"}
        {mode === "register" && `第一次用密码登录，先注册一下。密码至少 ${PASSWORD_MIN_LENGTH} 位。`}
        {mode === "forgot" && "填写注册时的邮箱，我们发一封重置密码的邮件给你。"}
      </p>
      <label>邮箱<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" autoFocus /></label>
      {mode !== "forgot" && (
        <label>密码
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={PASSWORD_MIN_LENGTH} autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder={mode === "register" ? `至少 ${PASSWORD_MIN_LENGTH} 位` : ""} />
        </label>
      )}
      {mode === "register" && (
        <label>再输一次密码<input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={PASSWORD_MIN_LENGTH} autoComplete="new-password" /></label>
      )}
      {notice && <p className="success">{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button type="submit" className="primary" disabled={busy}>{busy ? "请稍候…" : title}</button>
      </div>
      <p className="switch">
        {mode === "login" && <><button type="button" onClick={() => switchMode("register")}>没有账号？注册</button><span>·</span><button type="button" onClick={() => switchMode("forgot")}>忘记密码</button></>}
        {mode !== "login" && <button type="button" onClick={() => switchMode("login")}>← 返回登录</button>}
      </p>
      <style jsx>{`
        .switch { display: flex; justify-content: center; gap: 8px; margin: 0; color: var(--muted); font-size: 13px; }
        .switch button { padding: 0; border: 0; background: none; color: var(--brand-text); font-size: 13px; cursor: pointer; }
      `}</style>
    </form>
  );
}
