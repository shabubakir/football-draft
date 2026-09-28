import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRealtimeTransport } from "./ws-proxy-transport";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(url && key);

/**
 * Корпоративный прокси (dev-машины за squid). Если HTTP(S)_PROXY задан,
 * серверные запросы к Supabase идут через /api/proxy/supabase (node:http
 * к squid). На Vercel прокси нет — запросы прямые.
 */
/** true, если серверные запросы должны идти через прокси-роут. */
export function isProxied(): boolean {
  return process.env.NEXT_PUBLIC_USE_WS_PROXY === "1";
}

/**
 * Если прокси задан — возвращает URL серверного прокси-роута.
 * Используется и proxiedFetch, и raw-записи в geo-multiplayer route.
 */
function proxyRouteUrl(): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : `http://localhost:${process.env.PORT || 3000}`;
  return `${origin}/api/proxy/supabase`;
}

export interface ProxyCall {
  url: string;
  method: string;
  body?: string;
  headers: Record<string, string>;
}

/**
 * Делает запрос к Supabase REST: напрямую (Vercel) или через
 * /api/proxy/supabase (dev за корпоративным прокси).
 */
export async function proxiedSupabaseCall(call: ProxyCall): Promise<Response> {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxy) {
    return fetch(call.url, {
      method: call.method,
      headers: call.headers,
      body: call.body,
    });
  }
  const res = await fetch(proxyRouteUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: call.url,
      method: call.method,
      body: call.body,
      headers: call.headers,
    }),
  });
  const { status, body } = await res.json();
  if (status === 204) return new Response(null, { status });
  return new Response(
    typeof body === "string" ? body : JSON.stringify(body ?? null),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

function proxiedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxy) return fetch(input, init);
  const u = new URL(typeof input === "string" ? input : input.toString());
  const proxyBody = JSON.stringify({
    url: u.toString(),
    method: (init?.method ?? "GET").toUpperCase(),
    body: typeof init?.body === "string" ? init.body : undefined,
    headers: Object.fromEntries(new Headers(init?.headers as HeadersInit).entries()),
  });
  // Абсолютный URL: Node-окружение (route handler) не понимает относительные
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : `http://localhost:${process.env.PORT || 3000}`;
  return fetch(`${origin}/api/proxy/supabase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: proxyBody,
  }).then(async (res) => {
    const { status, body } = await res.json();
    // 204 (update/delete без .select()) — пустой ответ, body запрещён
    if (status === 204) {
      return new Response(null, { status });
    }
    return new Response(
      typeof body === "string" ? body : JSON.stringify(body ?? null),
      {
        status,
        headers: { "Content-Type": "application/json" },
      }
    );
  });
}

// Клиент для браузера (без сервиса)
let browserClient: SupabaseClient | null = null;
export function getSupabaseBrowser(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!browserClient) {
    browserClient = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
      // NEXT_PUBLIC_USE_WS_PROXY=1 → Realtime идёт через /api/proxy/supabase-ws
      // (dev-машина за корпоративным squid); иначе — обычный WebSocket.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      realtime: { transport: getRealtimeTransport() as any },
    } as Parameters<typeof createClient>[2]);
  }
  return browserClient;
}

// Клиент для сервера (SSR). Если задан прокси — fetch идёт через
// /api/proxy/supabase (см. proxiedFetch), иначе прямой.
let serverClient: SupabaseClient | null = null;
export function getSupabaseServer(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!serverClient) {
    // ВАЖНО: в этой версии supabase-js кастомный fetch указывается
    // как `global.fetch` (не верхнеуровневый `fetch`) — см.
    // node_modules/@supabase/supabase-js/src/SupabaseClient.ts
    serverClient = createClient(url, key, {
      auth: { persistSession: false },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global: { fetch: proxiedFetch as any },
    } as Parameters<typeof createClient>[2]);
  }
  return serverClient;
}
