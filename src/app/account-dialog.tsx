"use client";

import { useState, type FormEvent } from "react";
import { PASSWORD_MIN_LENGTH, useAuth } from "./auth";
import Modal from "./modal";

/** 账号：查看登录邮箱、设置 / 修改密码、退出。从「忘记密码」邮件回来时也在这里设置新密码。 */
export default function AccountDialog({ onClose }: { onClose: () => void }) {
  const { email, recovering, updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) { setError("两次输入的密码不一样。"); return; }
    setBusy(true);
    try {
      await updatePassword(password);
      setDone(true);
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={recovering ? "设置新密码" : "账号"} onClose={onClose}>
      <div className="stack">
        <p className="hint">已登录：<b>{email}</b></p>
        <form onSubmit={submit}>
          <p className="hint">
            {recovering ? "请设置一个新密码。" : `设置或修改密码。设置后，也可以用「邮箱 + 密码」登录（学校邮箱的登录链接失效时很有用）。密码至少 ${PASSWORD_MIN_LENGTH} 位。`}
          </p>
          <label>新密码<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={PASSWORD_MIN_LENGTH} autoComplete="new-password" autoFocus={recovering} /></label>
          <label>再输一次<input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={PASSWORD_MIN_LENGTH} autoComplete="new-password" /></label>
          {done && <p className="success">密码已保存，下次可以用邮箱 + 密码登录。</p>}
          {error && <p className="error" role="alert">{error}</p>}
          <div className="actions">
            <button type="button" onClick={() => { void signOut(); onClose(); }}>退出登录</button>
            <button type="submit" className="primary" disabled={busy}>{busy ? "保存中…" : "保存密码"}</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
