import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Role = "surveyor" | "manager" | "client" | "admin";

interface AuthState {
  role: Role | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface AuthContextType extends AuthState {
  login: (accessToken: string, refreshToken: string, role: Role | null) => void;
  logout: () => void;
  setRole: (role: Role | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const STORAGE_KEY = "esims_auth";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as AuthState;
    } catch {
      /* ignore parse errors */
    }
    return { role: null, accessToken: null, refreshToken: null };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore storage errors */
    }
  }, [state]);

  const login = (accessToken: string, refreshToken: string, role: Role | null) =>
    setState({ accessToken, refreshToken, role });
  const logout = () => setState({ accessToken: null, refreshToken: null, role: null });
  const setRole = (role: Role | null) => setState((s) => ({ ...s, role }));

  const value = useMemo(
    () => ({ ...state, login, logout, setRole }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
