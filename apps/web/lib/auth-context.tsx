'use client';
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { refreshToken } from './api';

const TOKEN_KEY = 'checkout_token';
const TOKEN_EXPIRY_KEY = 'checkout_token_expiry';
// Refresh 60 seconds before expiry to avoid races.
const REFRESH_BUFFER_MS = 60_000;

interface AuthCtx {
  token: string | null;
  login: (t: string, expiresIn?: number) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({ token: null, login: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (storedToken && storedExpiry) {
      const remainingSec = Math.floor((Number(storedExpiry) - Date.now()) / 1000);
      if (remainingSec > 0) {
        setToken(storedToken);
        scheduleRefresh(storedToken, remainingSec);
      } else {
        logout();
      }
    }
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scheduleRefresh(currentToken: string, expiresIn: number) {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    const delay = Math.max(0, expiresIn * 1000 - REFRESH_BUFFER_MS);
    refreshTimer.current = setTimeout(async () => {
      try {
        const { access_token, expires_in } = await refreshToken(currentToken);
        login(access_token, expires_in);
      } catch {
        // Token could not be refreshed — force re-login.
        logout();
      }
    }, delay);
  }

  function login(t: string, expiresIn = 3600) {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
    setToken(t);
    scheduleRefresh(t, expiresIn);
  }

  function logout() {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
