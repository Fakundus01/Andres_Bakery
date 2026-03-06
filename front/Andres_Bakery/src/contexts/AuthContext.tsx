import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authApi } from "../lib/api";
import type { User } from "../lib/types";

interface AuthContextValue {
  token: string;
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AUTH_STORAGE_KEY = "andres-bakery-auth";
const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthState {
  token: string;
  user: User | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) {
      return { token: "", user: null };
    }

    try {
      const parsed = JSON.parse(stored) as AuthState;
      return {
        token: parsed.token ?? "",
        user: parsed.user ?? null,
      };
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return { token: "", user: null };
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!auth.token || auth.user) {
      return;
    }

    setIsLoading(true);
    authApi
      .me(auth.token)
      .then((user) => {
        const next = { token: auth.token, user };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
        setAuth(next);
      })
      .catch(() => {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setAuth({ token: "", user: null });
      })
      .finally(() => setIsLoading(false));
  }, [auth.token, auth.user]);

  const setSession = (token: string, user: User) => {
    const next = { token, user };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
    setAuth(next);
  };

  const login = async (payload: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const session = await authApi.login(payload);
      const user = await authApi.me(session.access_token);
      setSession(session.access_token, user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: { name: string; email: string; password: string }) => {
    setIsLoading(true);
    try {
      const session = await authApi.register(payload);
      const user = await authApi.me(session.access_token);
      setSession(session.access_token, user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuth({ token: "", user: null });
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      token: auth.token,
      user: auth.user,
      isLoggedIn: Boolean(auth.token),
      isLoading,
      login,
      register,
      logout,
    }),
    [auth.token, auth.user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
