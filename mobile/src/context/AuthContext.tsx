import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { adminLogin, employeeLogin } from "../api/auth";
import { setAuthToken, setUnauthorizedHandler } from "../api/client";
import { Employee } from "../api/types";

const STORAGE_KEY = "punchcard_auth_session";

export type Session =
  | { role: "admin"; token: string; username: string }
  | { role: "employee"; token: string; employee: Employee };

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  error: string;
  clearError: () => void;
  loginAdmin: (username: string, password: string) => Promise<boolean>;
  loginEmployee: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateEmployeeSession: (employee: Employee) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (raw) {
          const parsed: Session = JSON.parse(raw);
          setSession(parsed);
          setAuthToken(parsed.token);
        }
      } catch {
        // ignore corrupt/missing session
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persistSession = useCallback(async (next: Session | null) => {
    setSession(next);
    setAuthToken(next?.token ?? null);
    if (next) {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  }, []);

  const logout = useCallback(async () => {
    await persistSession(null);
  }, [persistSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const loginAdmin = useCallback(
    async (username: string, password: string) => {
      setError("");
      try {
        const { token, admin } = await adminLogin(username, password);
        await persistSession({ role: "admin", token, username: admin.username });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "เข้าสู่ระบบไม่สำเร็จ");
        return false;
      }
    },
    [persistSession]
  );

  const loginEmployee = useCallback(
    async (username: string, password: string) => {
      setError("");
      try {
        const { token, employee } = await employeeLogin(username, password);
        await persistSession({ role: "employee", token, employee });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "เข้าสู่ระบบไม่สำเร็จ");
        return false;
      }
    },
    [persistSession]
  );

  const updateEmployeeSession = useCallback(
    (employee: Employee) => {
      setSession((prev) => {
        if (!prev || prev.role !== "employee") return prev;
        const next: Session = { ...prev, employee };
        SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    []
  );

  const value = useMemo(
    () => ({ session, loading, error, clearError: () => setError(""), loginAdmin, loginEmployee, logout, updateEmployeeSession }),
    [session, loading, error, loginAdmin, loginEmployee, logout, updateEmployeeSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
