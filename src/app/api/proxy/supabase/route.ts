import { NextRequest, NextResponse } from "next/server";
import http from "node:http";

// СЕРВЕРНЫЙ ПРОКСИ для Supabase REST (PostgREST).
//
// Используется на машинах, где прямой исходящий HTTPS заблокирован
// корпоративным прокси (dev-машины за squid). На Vercel прокси не
// нужен — запросы уходят напрямую.
//
// Параметры:
//   url    — полный URL Supabase (https://<ref>.supabase.co/rest/v1/...)
//   method — GET/POST/PATCH/DELETE
//   body   — JSON-строка (для POST/PATCH)
//   headers — JSON-объект (Authorization, apikey, Content-Profile, Prefer)
//
// Ответ: { status: <number>, body: <json|text> }

const SUPABASE_HOST = "wkxxdixxieiyjgreepvv.supabase.co";

function proxyTarget(): { host: string; port: number } | null {
  const p = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!p) return null;
  const u = new URL(p);
  return { host: u.hostname, port: Number(u.port) || 80 };
}

function viaProxy(
  target: URL,
  method: string,
  headers: Record<string, string>,
  body?: string
): Promise<{ status: number; raw: string }> {
  const t = proxyTarget();
  return new Promise((resolve, reject) => {
    if (!t) {
      reject(new Error("no proxy configured"));
      return;
    }
    // Абсолютный URL в path — формат для HTTP-прокси
    const req = http.request(
      {
        host: t.host,
        port: t.port,
        method,
        path: target.toString(),
        headers: {
          ...headers,
          "Proxy-Connection": "keep-alive",
        },
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, raw: d }));
      }
    );
    req.setTimeout(30_000, () => {
      req.destroy(new Error("proxy timeout"));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function directFetch(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string
): Promise<{ status: number; raw: string }> {
  const res = await fetch(url, {
    method,
    headers,
    body,
  });
  return { status: res.status, raw: await res.text() };
}

export async function POST(req: NextRequest) {
  const { url, method, body, headers } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  // Защита от SSRF: только наш supabase-хост
  if (target.hostname !== SUPABASE_HOST) {
    return NextResponse.json({ error: "forbidden host" }, { status: 403 });
  }

  const hdrs: Record<string, string> = { ...(headers as Record<string, string>) };
  let result: { status: number; raw: string };
  try {
    if (proxyTarget()) {
      result = await viaProxy(target, method || "GET", hdrs, body);
    } else {
      result = await directFetch(url, method || "GET", hdrs, body);
    }
  } catch (e) {
    return NextResponse.json(
      { error: `proxy failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 }
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.raw);
  } catch {
    parsed = result.raw;
  }
  return NextResponse.json({ status: result.status, body: parsed });
}
