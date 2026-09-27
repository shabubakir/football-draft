"use client";

// ============================================================
// AUTH CONTEXT — React context for auth state
// ============================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  getSupabaseBrowser,
  type UserProfile,
} from "@/lib/auth";
import { getDeviceId, getDeviceName } from "@/lib/profile";

// ---------- Types ----------

interface AuthContextType {
  // Auth state
  user: UserProfile | null;
  deviceId: string;
  deviceName: string;
  loading: boolean;
  isGuest: boolean;

  // Actions
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  loginWithGoogle: () => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  migrateGuest: () => Promise<{ success: boolean; error: string | null }>;
  updateProfile: (updates: { username?: string; avatar_url?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ---------- Provider ----------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceId] = useState<string>(() => getDeviceId());
  const [deviceName, setDeviceName] = useState<string>(() => getDeviceName());

  // Load initial auth state
  useEffect(() => {
    loadAuthState();
  }, []);

  // Возвращает профиль: если нет — создаёт (важно для Google OAuth:
  // профиль должен появиться автоматически, без ручной регистрации)
  const ensureProfile = async (
    supabase: NonNullable<ReturnType<typeof getSupabaseBrowser>>,
    authUser: { id: string; email?: string | null; user_metadata?: { name?: string; full_name?: string } }
  ): Promise<UserProfile> => {
    const { data: existing } = await supabase
      .from("user_profiles")
      .select()
      .eq("id", authUser.id)
      .maybeSingle();

    if (existing) return existing as UserProfile;

    // Генерируем username из email/имени, гарантируя уникальность
    const base =
      (authUser.user_metadata?.name ?? authUser.user_metadata?.full_name ?? authUser.email ?? "user")
        .split("@")[0]
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 16) || "user";

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .insert({ id: authUser.id, username: base })
      .select()
      .single();

    if (!error && profile) return profile as UserProfile;

    // Имя занято — пробуем с суффиксом
    const { data: retry, error: retryErr } = await supabase
      .from("user_profiles")
      .insert({ id: authUser.id, username: `${base.slice(0, 12)}_${authUser.id.slice(0, 4)}` })
      .select()
      .single();

    if (retryErr) throw new Error(retryErr.message);
    return retry as UserProfile;
  };

  const loadAuthState = async () => {
    try {
      const supabase = getSupabaseBrowser();
      if (!supabase) {
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.id) {
        const profile = await ensureProfile(supabase, session.user).catch((e) => {
          console.error("Profile ensure error:", e);
          return null;
        });
        if (profile) setUser(profile);
      }
    } catch (e) {
      console.error("Auth load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return { error: "Supabase не настроен" };

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error: "Неверный email или пароль" };

    const profile = await ensureProfile(supabase, data.user);
    setUser(profile);
    return { error: null };
  }, []);

  const register = useCallback(
    async (email: string, password: string, username: string) => {
      // Use API route to handle registration with service role
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, username }),
        });

        const data = await res.json();

        if (!res.ok) {
          return { error: data.error || "Ошибка регистрации" };
        }

        // Now log in with the new credentials
        const supabase = getSupabaseBrowser();
        if (!supabase) return { error: "Supabase не настроен" };

        const { data: loginData, error: loginError } =
          await supabase.auth.signInWithPassword({ email, password });

        if (loginError) return { error: loginError.message };

        const profile = await ensureProfile(supabase, loginData.user);
        setUser(profile);
        return { error: null };
      } catch (e) {
        console.error("Register error:", e);
        return { error: "Ошибка сети" };
      }
    },
    [ensureProfile]
  );

  const loginWithGoogle = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return { error: "Supabase не настроен" };

    // Запоминаем, куда вернуться после OAuth (текущий URL)
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?returnTo=${returnTo}`,
      },
    });

    if (error) {
      return { error: error.message };
    }

    // Supabase автоматически перенаправит на Google
    return { error: null };
  }, []);

  const logout = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      const profile = await ensureProfile(supabase, session.user).catch(() => null);
      setUser(profile);
    } else {
      setUser(null);
    }
  }, []);

  const migrateGuest = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return { success: false, error: "Supabase не настроен" };

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return { success: false, error: "Не авторизован" };

    // Check if already migrated
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("migrated_from_device_id")
      .eq("id", authUser.id)
      .maybeSingle();

    if (profile?.migrated_from_device_id) {
      return { success: false, error: "Прогресс уже был импортирован" };
    }

    // Mark as migrated
    const { error } = await supabase
      .from("user_profiles")
      .update({ migrated_from_device_id: deviceId })
      .eq("id", authUser.id);

    if (error) return { success: false, error: error.message };

    // Refresh user
    await refreshUser();
    return { success: true, error: null };
  }, [deviceId, refreshUser]);

  const updateProfile = useCallback(
    async (updates: { username?: string; avatar_url?: string }) => {
      const supabase = getSupabaseBrowser();
      if (!supabase || !user) return;

      const { error } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("id", user.id);

      if (!error) {
        await refreshUser();
      }
    },
    [user, refreshUser]
  );

  const isGuest = !user && !loading;

  return (
    <AuthContext.Provider
      value={{
        user,
        deviceId,
        deviceName,
        loading,
        isGuest,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshUser,
        migrateGuest,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------- Hook ----------

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
