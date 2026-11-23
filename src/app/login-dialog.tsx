"use client";

import { useState, type FormEvent } from "react";
import { PASSWORD_MIN_LENGTH, useAuth } from "./auth";
import Modal from "./modal";

type PasswordMode = "login" | "register" | "forgot";

/** 邮箱 + 密码登录。以前用邮件链接登录、还没有密码的账号，用「忘记密码」设置一个。 */
export default function LoginDialog({ onClose }: { onClose: () => void }) {
  const { configured } = useAuth();
  return (
    <Modal title="登录" onClose={onClose}>
      {configured ? <PasswordLogin onClose={onClose} /> : <p className="error">登录功能还没有配置（缺少 Supabase 公开配置）。</p>}
    </Modal>
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
        setNotice(`邮件已发送到 ${email.trim()}，点里面的链接会回到这里，设置新密码后就能用密码登录了。`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const title = { login: "登录", register: "注册账号", forgot: "发送设置密码邮件" }[mode];

  return (
    <form onSubmit={submit}>
      <p className="hint">
        {mode === "login" && "用邮箱和密码登录。第一次来请先注册；以前用邮件链接登录过的，点「忘记密码」设置一个密码就行。"}
        {mode === "register" && `第一次用密码登录，先注册一下。密码至少 ${PASSWORD_MIN_LENGTH} 位。`}
        {mode === "forgot" && "填写你的邮箱，我们发一封设置密码的邮件给你。以前用邮件链接登录、还没有密码的账号，也用这个来设置。"}
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
        {mode === "login" && <><button type="button" onClick={() => switchMode("register")}>没有账号？注册</button><span>·</span><button type="button" onClick={() => switchMode("forgot")}>忘记密码 / 设置密码</button></>}
        {mode !== "login" && <button type="button" onClick={() => switchMode("login")}>← 返回登录</button>}
      </p>
      <style jsx>{`
        .switch { display: flex; justify-content: center; gap: 8px; margin: 0; color: var(--muted); font-size: 13px; }
        .switch button { padding: 0; border: 0; background: none; color: var(--brand-text); font-size: 13px; cursor: pointer; }
      `}</style>
    </form>
  );
}
