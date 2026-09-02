import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { AuthApi } from "../api/auth";

const AuthContext = createContext(null);

// ms left until the JWT's `exp` claim; 0 if the token is missing, malformed, or already expired.
function msUntilExpiry(token) {
  try {
    const { exp } = JSON.parse(atob(token.split(".")[1]));
    return exp * 1000 - Date.now();
  } catch {
    return 0;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("wishroom_user");
    return raw ? JSON.parse(raw) : null;
  });
  const timerRef = useRef(null);

  const logout = useCallback(() => {
    clearTimeout(timerRef.current);
    localStorage.removeItem("wishroom_token");
    localStorage.removeItem("wishroom_user");
    setUser(null);
  }, []);

  // Auto-logout when the token expires (7 days), even if the user is idle and
  // makes no request. Re-runs on mount and after every login/logout.
  useEffect(() => {
    const token = localStorage.getItem("wishroom_token");
    if (!token) return;
    const ms = msUntilExpiry(token);
    if (ms <= 0) {
      logout();
      return;
    }
    timerRef.current = setTimeout(logout, ms);
    return () => clearTimeout(timerRef.current);
  }, [user, logout]);

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
