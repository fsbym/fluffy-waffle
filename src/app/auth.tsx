"use client";

import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { browserAuthClient } from "@/lib/supabase-browser";

type Auth = {
  ready: boolean;
  configured: boolean;
  email: string | null;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** 带上登录凭证的 fetch */
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = browserAuthClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const signIn = useCallback(async (email: string) => {
    if (!supabase) throw new Error("登录功能还没有配置");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    if (error) throw new Error(error.message);
  }, [supabase]);

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
    ready, configured: Boolean(supabase), email: session?.user.email ?? null, signIn, signOut, authFetch,
  }), [ready, supabase, session, signIn, signOut, authFetch]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): Auth {
  const auth = use(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside AuthProvider");
  return auth;
}
