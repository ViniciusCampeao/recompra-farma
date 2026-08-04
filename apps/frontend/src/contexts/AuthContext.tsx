import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api, setUnauthorizedHandler } from "../lib/api";

interface User {
  id: string;
  name?: string;
  email: string;
  role: string;
}

interface AuthCtx {
  token: string | null;
  user: User | null;
  sessionExpired: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const LS_KEY = "farmatec_token";

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(LS_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(LS_KEY);
  }, []);

  const login = (t: string) => {
    setSessionExpired(false);
    setToken(t);
    localStorage.setItem(LS_KEY, t);
  };

  // Qualquer requisição autenticada que volte 401 (token expirado/inválido)
  // passa por aqui — desloga e sinaliza o motivo para a tela de login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSessionExpired(true);
      logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    if (!token) return;
    api<User>("/auth/me", { token }).then(setUser).catch(logout);
  }, [token, logout]);

  return (
    <Ctx.Provider value={{ token, user, sessionExpired, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}
