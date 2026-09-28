// ============================================================
// Прокси Wikimedia Commons — отключает hotlink-защиту (403)
//
// Commons отдаёт 403 на прямые запросы от произвольных
// referrer'ов (в т.ч. от Vercel-доменов). Решения:
//   1. /api/geo-image?url=<encoded> — Next.js route handler,
//      сервер ходит на commons.wikimedia.org (там всегда 200),
//      прокидывает байты + Content-Type.
//   2. referrerPolicy="no-referrer" как подстраховка.
//
// URL строится в lib/geo-image.ts: geoImageUrl(location.image)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import http from "node:http";

const MAX_AGE_7D = 7 * 24 * 60 * 60;

/**
 * Запрос к upstream через корпоративный HTTP-прокси (dev-машины за squid).
 * В prod (Vercel) прокси нет — fetch идёт напрямую.
 */
function proxiedFetch(
  u: URL,
  headers: Record<string, string>
): Promise<Response> {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxy) {
    return fetch(u, { cache: "no-store", headers });
  }
  const p = new URL(proxy);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: p.hostname,
        port: Number(p.port) || 80,
        method: "GET",
        path: u.toString(),
        headers: { ...headers, "Proxy-Connection": "keep-alive" },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks);
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
            // 30x от upstream (например, Special:FilePath → upload.wikimedia.org):
            // следим за Location
            const loc = res.headers.location;
            if (loc) {
              const lu = new URL(loc, u);
              return proxiedFetch(lu, headers)
                .then(resolve)
                .catch(reject);
            }
          }
          resolve(
            new Response(body, {
              status: res.statusCode ?? 0,
              statusText: res.statusMessage,
              headers: {
                "content-type": res.headers["content-type"] ?? "image/jpeg",
              },
            })
          );
        });
      }
    );
    req.setTimeout(30_000, () => {
      req.destroy();
      reject(new Error("upstream timeout via proxy"));
    });
    req.on("error", reject);
    req.end();
  });
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return new NextResponse("missing url", { status: 400 });
  }
  // Жёсткий allowlist: только официальные домены Wikimedia.
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }
  if (
    u.protocol !== "https:" ||
    (u.hostname !== "commons.wikimedia.org" &&
      !u.hostname.endsWith(".wikipedia.org") &&
      !u.hostname.endsWith(".wikimedia.org"))
  ) {
    return new NextResponse("url not allowed", { status: 403 });
  }

  // Oкружения:
  //  - Vercel (prod): чистый egress → прямой запрос всегда работает.
  //  - Локальная разработка на машине с corporate-прокси: прямой
  //    fetch из Node падает (нет прямого выхода в интернет).
  //    Тогда честно отдаём 502 с пояснением — в прод всё ок.
  // Браузер игрока ходит к /api/geo-image (localhost) — ему не
  // нужен внешний выход, только до домена игры.
  try {
    const upstream = await proxiedFetch(u, {
      "user-agent": "FootballDraftGeo/1.0 (image proxy)",
    });
    if (!upstream.ok) {
      return new NextResponse(upstream.statusText, { status: upstream.status });
    }
    const type = upstream.headers.get("content-type") || "image/jpeg";
    const body = Buffer.from(await upstream.arrayBuffer());
    const res = new NextResponse(body, { status: 200 });
    res.headers.set("content-type", type);
    res.headers.set("cache-control", `public, max-age=${MAX_AGE_7D}`);
    return res;
  } catch (e) {
    return new NextResponse(
      `proxy error: ${e instanceof Error ? e.message : "unknown"} ` +
        "(нет прямого выхода в интернет в этом окружении; в Vercel работает)",
      { status: 502 }
    );
  }
}
