import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "../lib/api";

interface User {
  name?: string;
  email: string;
}

interface AuthCtx {
  token: string | null;
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const logout = () => { setToken(null); setUser(null); };
  const login = (t: string) => setToken(t);

  useEffect(() => {
    if (!token) return;
    api<User>("/auth/me", { token }).then(setUser).catch(logout);
  }, [token]);

  return <Ctx.Provider value={{ token, user, login, logout }}>{children}</Ctx.Provider>;
}
