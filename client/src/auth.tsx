import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setAuthToken, setUnauthorizedHandler } from './api';

const TOKEN_KEY = 'kps.token';

interface AuthCtx {
  authed: boolean;
  checking: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<string | null>; // returns error message or null
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [username, setUsername] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setToken(null);
    setUsername(null);
  }, []);

  // any API 401 anywhere drops the session back to the login screen
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // validate an existing token on first load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (!stored) {
        setChecking(false);
        return;
      }
      setAuthToken(stored);
      try {
        const me = await api.me();
        if (!cancelled) {
          setUsername(me.username);
          setToken(stored);
        }
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [logout]);

  const login = useCallback(async (u: string, p: string): Promise<string | null> => {
    try {
      const res = await api.login(u, p);
      localStorage.setItem(TOKEN_KEY, res.token);
      setAuthToken(res.token);
      setToken(res.token);
      setUsername(res.username);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'เข้าสู่ระบบไม่สำเร็จ';
    }
  }, []);

  const value: AuthCtx = { authed: !!token, checking, username, login, logout };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
