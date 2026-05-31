'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthCtx {
  token: string | null;
  login: (t: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({ token: null, login: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  return (
    <AuthContext.Provider value={{ token, login: setToken, logout: () => setToken(null) }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
