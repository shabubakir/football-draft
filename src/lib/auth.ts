// ============================================================
// AUTH SYSTEM — Supabase Auth wrapper
// ============================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let browserClient: SupabaseClient | null = null;
let serverClient: SupabaseClient | null = null;

/**
 * Get or create the browser Supabase client (with auth session)
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (browserClient) return browserClient;
  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return browserClient;
}

/**
 * Get or create the server Supabase client (no session, for API routes)
 */
export function getSupabaseServer(): SupabaseClient | null {
  if (serverClient) return serverClient;
  serverClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
  return serverClient;
}

// ---------- Types ----------

export interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  last_active_at: string;
  migrated_from_device_id: string | null;
}

export interface GameStats {
  gamesPlayed: number;
  [key: string]: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface UserAchievement {
  achievement_id: string;
  unlocked_at: string;
}

export interface AuthUser {
  user: {
    id: string;
    email?: string;
    created_at: string;
  } | null;
  session: {
    access_token: string;
    expires_at?: number;
    user: {
      id: string;
      email?: string;
    };
  } | null;
}

// ---------- Auth actions ----------

/**
 * Register a new user with email + password
 */
export async function registerUser(
  email: string,
  password: string,
  username: string
): Promise<{ user: UserProfile | null; error: string | null }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { user: null, error: "Supabase не настроен" };

  // Validate username
  const cleanUsername = username.trim();
  if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 20) {
    return { user: null, error: "Username должен быть 3-20 символов" };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return { user: null, error: "Username может содержать только буквы, цифры и _" };
  }

  // Check if username is taken
  const { data: existing, error: checkErr } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("username", cleanUsername)
    .maybeSingle();

  if (checkErr) return { user: null, error: checkErr.message };
  if (existing) return { user: null, error: "Username уже занят" };

  // Register with Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: cleanUsername,
      },
    },
  });

  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: "Ошибка регистрации" };

  // Create profile (username unique check already done)
  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .insert({
      id: data.user.id,
      username: cleanUsername,
    })
    .select()
    .single();

  if (profileErr) return { user: null, error: profileErr.message };

  return { user: profile as UserProfile, error: null };
}

/**
 * Login with email + password
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: UserProfile | null; error: string | null }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { user: null, error: "Supabase не настроен" };

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { user: null, error: "Неверный email или пароль" };
  if (!data.user) return { user: null, error: "Ошибка входа" };

  // Fetch profile
  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select()
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileErr) return { user: null, error: profileErr.message };
  if (!profile) {
    // Profile doesn't exist (shouldn't happen), create it
    const { data: newProfile } = await supabase
      .from("user_profiles")
      .insert({
        id: data.user.id,
        username: `user_${data.user.id.slice(0, 8)}`,
      })
      .select()
      .single();
    return { user: newProfile as UserProfile, error: null };
  }

  return { user: profile as UserProfile, error: null };
}

/**
 * Login with Google OAuth
 */
export async function loginWithGoogle(): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { error: "Supabase не настроен" };

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Logout current user
 */
export async function logoutUser(): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return;
  await supabase.auth.signOut();
}

/**
 * Get current session user
 */
export async function getCurrentUser(): Promise<AuthUser> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { user: null, session: null };

  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();

  return { user, session };
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select()
    .eq("id", userId)
    .maybeSingle();

  if (error) return null;
  return (data as UserProfile) ?? null;
}

/**
 * Migrate guest progress to authenticated account
 */
export async function migrateGuestProgress(
  deviceId: string,
  username: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { success: false, error: "Supabase не настроен" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Не авторизован" };

  // Check if already migrated
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("migrated_from_device_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.migrated_from_device_id) {
    return { success: false, error: "Прогресс уже был импортирован" };
  }

  // Fetch guest profile
  const { data: guestProfile } = await supabase
    .from("players_profile")
    .select("xp, display_name")
    .eq("device_id", deviceId)
    .maybeSingle();

  // Update user profile with migrated device id
  const { error: updateErr } = await supabase
    .from("user_profiles")
    .update({
      migrated_from_device_id: deviceId,
    })
    .eq("id", user.id);

  if (updateErr) return { success: false, error: updateErr.message };

  // Migrate XP (if any)
  if (guestProfile?.xp && guestProfile.xp > 0) {
    await supabase.from("xp_events").insert({
      user_id: user.id,
      amount: guestProfile.xp,
      reason: "guest_migration",
    });
  }

  return { success: true, error: null };
}
