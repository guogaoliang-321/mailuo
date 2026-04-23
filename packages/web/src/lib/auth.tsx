"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "./api";

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (data: { displayName: string }) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await api.get<User>("/auth/me");
    setUser(res.success && res.data ? res.data : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string): Promise<string | null> => {
    const res = await api.post<User>("/auth/login", { email, password });
    if (res.success && res.data) {
      setUser(res.data);
      return null;
    }
    return res.error ?? "登录失败";
  };

  const logout = async () => {
    await api.post("/auth/logout", {});
    setUser(null);
  };

  const updateProfile = async (data: { displayName: string }): Promise<string | null> => {
    const res = await api.patch<User>("/auth/profile", data);
    if (res.success && res.data) {
      setUser((prev) => (prev ? { ...prev, ...res.data } : res.data!));
      return null;
    }
    return res.error ?? "更新失败";
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
