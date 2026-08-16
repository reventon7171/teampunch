import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { adminLogin, employeeLogin, registerOrg } from "../api/auth";
import { setAuthToken, setUnauthorizedHandler } from "../api/client";
import { Employee } from "../api/types";

const STORAGE_KEY = "punchcard_auth_session";
const SLUG_STORAGE_KEY = "punchcard_last_org_slug";

export type Session =
  | { role: "admin"; token: string; username: string }
  | { role: "employee"; token: string; employee: Employee };

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  error: string;
  lastSlug: string;
  clearError: () => void;
  loginAdmin: (slug: string, username: string, password: string) => Promise<boolean>;
  loginEmployee: (slug: string, username: string, password: string) => Promise<boolean>;
  register: (organizationName: string, slug: string, adminUsername: string, adminPassword: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateEmployeeSession: (employee: Employee) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSlug, setLastSlug] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (raw) {
          const parsed: Session = JSON.parse(raw);
          setSession(parsed);
          setAuthToken(parsed.token);
        }
        const slug = await SecureStore.getItemAsync(SLUG_STORAGE_KEY);
        if (slug) setLastSlug(slug);
      } catch {
        // ignore corrupt/missing session
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rememberSlug = useCallback((slug: string) => {
    setLastSlug(slug);
    SecureStore.setItemAsync(SLUG_STORAGE_KEY, slug).catch(() => {});
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
    async (slug: string, username: string, password: string) => {
      setError("");
      try {
        const { token, admin } = await adminLogin(slug, username, password);
        rememberSlug(slug);
        await persistSession({ role: "admin", token, username: admin.username });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "เข้าสู่ระบบไม่สำเร็จ");
        return false;
      }
    },
    [persistSession, rememberSlug]
  );

  const loginEmployee = useCallback(
    async (slug: string, username: string, password: string) => {
      setError("");
      try {
        const { token, employee } = await employeeLogin(slug, username, password);
        rememberSlug(slug);
        await persistSession({ role: "employee", token, employee });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "เข้าสู่ระบบไม่สำเร็จ");
        return false;
      }
    },
    [persistSession, rememberSlug]
  );

  const register = useCallback(
    async (organizationName: string, slug: string, adminUsername: string, adminPassword: string) => {
      setError("");
      try {
        const { token, organization, admin } = await registerOrg(organizationName, slug, adminUsername, adminPassword);
        rememberSlug(organization.slug);
        await persistSession({ role: "admin", token, username: admin.username });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "สมัครใช้งานไม่สำเร็จ");
        return false;
      }
    },
    [persistSession, rememberSlug]
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
    () => ({
      session,
      loading,
      error,
      lastSlug,
      clearError: () => setError(""),
      loginAdmin,
      loginEmployee,
      register,
      logout,
      updateEmployeeSession,
    }),
    [session, loading, error, lastSlug, loginAdmin, loginEmployee, register, logout, updateEmployeeSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
