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

const MAX_AGE_7D = 7 * 24 * 60 * 60;

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
    const upstream = await fetch(u, {
      cache: "no-store",
      headers: { "user-agent": "FootballDraftGeo/1.0 (image proxy)" },
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
