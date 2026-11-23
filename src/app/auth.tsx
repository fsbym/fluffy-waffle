"use client";

import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthError, Session } from "@supabase/supabase-js";
import { browserAuthClient } from "@/lib/supabase-browser";

export const PASSWORD_MIN_LENGTH = 8; // 与 Supabase 后台的 password_min_length 一致

type Auth = {
  ready: boolean;
  configured: boolean;
  email: string | null;
  /** 刚通过「忘记密码」邮件进来，需要设置新密码 */
  recovering: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  /** 用邮箱 + 密码注册。返回 needsConfirmation=true 表示需要先点确认邮件 */
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  sendPasswordReset: (email: string) => Promise<void>;
  /** 已登录时设置 / 修改密码 */
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** 带上登录凭证的 fetch */
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<Auth | null>(null);

/** 把 Supabase 的英文错误翻译成用户能看懂的提示 */
function friendly(error: AuthError | Error): Error {
  const m = error.message;
  if (/invalid login credentials/i.test(m)) {
    return new Error("邮箱或密码不对。如果你以前是用邮件链接登录的、还没设置过密码，请点下面的「忘记密码」设置一个。");
  }
  if (/email not confirmed/i.test(m)) return new Error("邮箱还没确认：请先点一下确认邮件里的链接，再用密码登录。");
  if (/already registered|already been registered/i.test(m)) return new Error("这个邮箱已经注册过了，请直接登录。");
  if (/password should be at least|password.*(short|length)/i.test(m)) return new Error(`密码至少 ${PASSWORD_MIN_LENGTH} 位。`);
  if (/weak|pwned|leaked/i.test(m)) return new Error("这个密码太常见了，换一个更难猜的吧。");
  if (/same.*password|different from the old/i.test(m)) return new Error("新密码不能和旧密码一样。");
  const wait = m.match(/after (\d+) seconds?/i);
  if (wait) return new Error(`操作太频繁了，请 ${wait[1]} 秒后再试。`);
  if (/rate limit/i.test(m)) return new Error("发送太频繁了，请稍后再试。");
  return new Error(m);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = browserAuthClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (event === "SIGNED_OUT" || event === "USER_UPDATED") setRecovering(false);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const client = useCallback(() => {
    if (!supabase) throw new Error("登录功能还没有配置");
    return supabase;
  }, [supabase]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await client().auth.signInWithPassword({ email, password });
    if (error) throw friendly(error);
  }, [client]);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await client().auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    if (error) throw friendly(error);
    // 邮箱已存在时，Supabase 为了防止探测账号，不报错但返回空的 identities
    if (data.user && data.user.identities?.length === 0) {
      throw new Error("这个邮箱已经注册过了，请直接用密码登录；如果以前是用邮件链接登录、还没设置过密码，请点「忘记密码」设置一个。");
    }
    return { needsConfirmation: !data.session };
  }, [client]);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) throw friendly(error);
  }, [client]);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await client().auth.updateUser({ password });
    if (error) throw friendly(error);
    setRecovering(false);
  }, [client]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, [supabase]);

  const authFetch = useCallback(async (input: string, init: RequestInit = {}) => {
    const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
    const headers = new Headers(init.headers);
    if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
    return fetch(input, { ...init, headers });
  }, [supabase]);

  const value = useMemo<Auth>(() => ({
    ready, configured: Boolean(supabase), email: session?.user.email ?? null, recovering,
    signInWithPassword, signUp, sendPasswordReset, updatePassword, signOut, authFetch,
  }), [ready, supabase, session, recovering, signInWithPassword, signUp, sendPasswordReset, updatePassword, signOut, authFetch]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): Auth {
  const auth = use(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside AuthProvider");
  return auth;
}
