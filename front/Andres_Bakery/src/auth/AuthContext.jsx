import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = "ab_auth";

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  });

  const setSession = (token, user) => {
    const payload = { token, user };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
    localStorage.removeItem("ab_admin_token");
    localStorage.removeItem("ab_logged_in");
    setAuth(payload);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem("ab_admin_token");
    localStorage.removeItem("ab_logged_in");
    setAuth(null);
  };

  const isLoggedIn = Boolean(auth?.token);

  const value = useMemo(
    () => ({
      isLoggedIn,
      token: auth?.token || "",
      user: auth?.user || null,
      setSession,
      logout,
    }),
    [auth, isLoggedIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}