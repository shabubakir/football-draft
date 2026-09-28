import { NextRequest, NextResponse } from "next/server";
import http from "node:http";

// DEV-ПРОКСИ для OSM-тайлов (dev-машины за корпоративным squid).
//
// Браузер за squid-прокси не может напрямую загрузить
// https://tile.openstreetmap.org/... (CONNECT заблокирован/запроксирован),
// поэтому карта (geo-map-impl.tsx) при NEXT_PUBLIC_USE_WS_PROXY=1
// запрашивает тайлы через этот роут: /api/geo-tile?z=2&x=1&y=1.
//
// Node ходит на tile.openstreetmap.org через корпоративный HTTP-прокси
// (аналогично /api/proxy/supabase). В prod (Vercel) роут не используется —
// тайлы грузятся напрямую, как и раньше.

const MAX_AGE_7D = 7 * 24 * 60 * 60;

export async function GET(req: NextRequest) {
  const z = req.nextUrl.searchParams.get("z");
  const x = req.nextUrl.searchParams.get("x");
  const y = req.nextUrl.searchParams.get("y");
  if (!z || !x || !y) {
    return new NextResponse("missing z/x/y", { status: 400 });
  }
  const target = new URL(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`);

  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxy) {
    // Прямой выход (Vercel / домашняя сеть)
    try {
      const up = await fetch(target, { cache: "no-store" });
      if (!up.ok) return new NextResponse("upstream error", { status: up.status });
      const body = Buffer.from(await up.arrayBuffer());
      const res = new NextResponse(body, { status: 200 });
      res.headers.set("content-type", up.headers.get("content-type") || "image/png");
      res.headers.set("cache-control", `public, max-age=${MAX_AGE_7D}`);
      return res;
    } catch {
      return new NextResponse("proxy error", { status: 502 });
    }
  }

  const p = new URL(proxy);
  const body = await new Promise<Buffer | null>((resolve) => {
    const req2 = http.request(
      {
        host: p.hostname,
        port: Number(p.port) || 80,
        method: "GET",
        path: target.toString(),
        headers: {
          "User-Agent": "FootballDraftGeo/1.0 (tile proxy)",
          "Proxy-Connection": "keep-alive",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      }
    );
    req2.setTimeout(30_000, () => {
      req2.destroy();
      resolve(null);
    });
    req2.on("error", () => resolve(null));
    req2.end();
  });
  if (!body) return new NextResponse("tile fetch failed", { status: 502 });
  const res = new NextResponse(new Uint8Array(body), { status: 200 });
  res.headers.set("content-type", "image/png");
  res.headers.set("cache-control", `public, max-age=${MAX_AGE_7D}`);
  return res;
}
