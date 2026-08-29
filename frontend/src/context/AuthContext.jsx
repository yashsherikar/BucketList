import { createContext, useContext, useState, useCallback } from "react";
import { AuthApi } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("wishroom_user");
    return raw ? JSON.parse(raw) : null;
  });

  const persist = (authResponse) => {
    localStorage.setItem("wishroom_token", authResponse.token);
    const u = { id: authResponse.userId, name: authResponse.name, email: authResponse.email };
    localStorage.setItem("wishroom_user", JSON.stringify(u));
    setUser(u);
  };

  const login = useCallback(async (email, password) => {
    const res = await AuthApi.login({ email, password });
    persist(res);
    return res;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await AuthApi.register({ name, email, password });
    persist(res);
    return res;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("wishroom_token");
    localStorage.removeItem("wishroom_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
