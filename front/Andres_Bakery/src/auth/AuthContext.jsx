import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem("ab_logged_in"))
  );

  const login = () => {
    localStorage.setItem("ab_logged_in", "true");
    setIsLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem("ab_logged_in");
    setIsLoggedIn(false);
  };

  const value = useMemo(
    () => ({ isLoggedIn, login, logout }),
    [isLoggedIn]
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