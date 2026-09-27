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
        // Fetch profile
        const { data: profile } = await supabase
          .from("user_profiles")
          .select()
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile) {
          setUser(profile as UserProfile);
        }
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

    // Fetch profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select()
      .eq("id", data.user.id)
      .maybeSingle();

    setUser(profile as UserProfile);
    return { error: null };
  }, []);

  const register = useCallback(
    async (email: string, password: string, username: string) => {
      const supabase = getSupabaseBrowser();
      if (!supabase) return { error: "Supabase не настроен" };

      // Check username uniqueness
      const { data: existing } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      if (existing) return { error: "Username уже занят" };

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });

      if (error) return { error: error.message };
      if (!data.user) return { error: "Ошибка регистрации" };

      // Create profile
      const { data: profile, error: profileErr } = await supabase
        .from("user_profiles")
        .insert({
          id: data.user.id,
          username,
        })
        .select()
        .single();

      if (profileErr) return { error: profileErr.message };

      setUser(profile as UserProfile);
      return { error: null };
    },
    []
  );

  const loginWithGoogle = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return { error: "Supabase не настроен" };

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

    if (error) return { error: error.message };
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
      const { data: profile } = await supabase
        .from("user_profiles")
        .select()
        .eq("id", session.user.id)
        .maybeSingle();

      setUser(profile as UserProfile);
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
