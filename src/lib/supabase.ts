import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(url && key);

// Клиент для браузера (без сервиса)
let browserClient: SupabaseClient | null = null;
export function getSupabaseBrowser(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!browserClient) {
    browserClient = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return browserClient;
}

// Клиент для сервера (SSR)
let serverClient: SupabaseClient | null = null;
export function getSupabaseServer(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!serverClient) {
    serverClient = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return serverClient;
}
