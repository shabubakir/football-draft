import { NextRequest, NextResponse } from "next/server";

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory cache: skin name (lowercase) → per-wear prices
type PriceEntry = {
  // Per-wear prices (only for weapon skins)
  wears?: Record<string, number>; // { "Factory New": 100, "Field-Tested": 50, ... }
  // Single price (knives/gloves or fallback)
  single?: number;
  // Pre-computed range for the grid
  min: number;
  max: number;
  ts: number;
};

let priceCache: Map<string, PriceEntry> = new Map();

const WEARS = [
  "Factory New",
  "Minimal Wear",
  "Field-Tested",
  "Well-Worn",
  "Battle-Scarred",
] as const;

// Static case prices
import staticPrices from "@/lib/data/cs2-prices.json";

export async function GET(req: NextRequest) {
  const now = Date.now();
  const caseName = req.nextUrl.searchParams.get("case");

  if (!caseName) {
    const prices: Record<string, number> = {};
    for (const p of staticPrices as Array<{ name: string; price: number }>) {
      prices[p.name.toLowerCase()] = p.price;
    }
    return NextResponse.json({ prices, source: "static", ts: now });
  }

  const { CASES, isKnifeOrGloves, knifePriceQuery, skinPriceQuery } = await import("@/lib/cs2");
  const cs = CASES.find((c) => c.name === caseName);
  if (!cs) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const allItems: string[] = [
    ...cs.items.map((i) => i.n),
    ...cs.rares.map((r) => r.n),
  ];

  // Кэш на 7 дней: имена, у которых уже есть цена
  const cached = new Map<string, PriceEntry>();
  for (const name of allItems) {
    const e = priceCache.get(name.toLowerCase());
    if (e && Date.now() - e.ts < CACHE_TTL) cached.set(name.toLowerCase(), e);
  }

  // Запросы: скин → 5 wears; нож → 1 базовое имя ("★ Karambit");
  // перчатки → SkinCash не знает, просим полное имя (404 → без цены)
  const allWearRequests: { name: string; mhn: string }[] = [];
  const seenReq = new Set<string>();
  for (const name of allItems) {
    const key = name.toLowerCase();
    if (cached.has(key)) continue;
    if (isKnifeOrGloves(name)) {
      const kq = knifePriceQuery(name); // "★ Karambit" | null (перчатки)
      const mhn = kq ?? ("★ " + name); // перчатки → полное имя
      const lk = mhn.toLowerCase();
      if (!seenReq.has(lk)) {
        seenReq.add(lk);
        allWearRequests.push({ name, mhn });
      }
    } else {
      for (const wear of WEARS) {
        const mhn = `${skinPriceQuery(name)} (${wear})`;
        const lk = mhn.toLowerCase();
        if (!seenReq.has(lk)) {
          seenReq.add(lk);
          allWearRequests.push({ name, mhn });
        }
      }
    }
  }

  // Забираем batch'ем через общий клиент (прокси на dev, fetch на prod)
  const { skincashPrices } = await import("@/lib/skincash");
  const livePrices = await skincashPrices(
    allWearRequests.map((r) => r.mhn),
    { perRequestMs: 8000, totalMs: 60000 }
  );

  // Раскладываем: live + кэш → prices
  const prices: Record<
    string,
    { min: number; max: number; wears?: Record<string, number> }
  > = {};
  for (const name of allItems) {
    const key = name.toLowerCase();
    const ce = cached.get(key);
    const wears: Record<string, number> = ce?.wears ? { ...ce.wears } : {};
    const isKnife = isKnifeOrGloves(name);

    if (isKnife) {
      const kq = knifePriceQuery(name); // "★ Karambit" | null (перчатки)
      const queryName = kq ?? "★ " + name;
      const p =
        (kq ? livePrices.get(kq.toLowerCase()) : null) ??
        livePrices.get(queryName.toLowerCase()) ??
        ce?.single ??
        null;
      if (p != null) {
        prices[key] = { min: p, max: p };
        priceCache.set(key, { single: p, min: p, max: p, ts: Date.now() });
      }
    } else {
      const q = skinPriceQuery(name);
      for (const wear of WEARS) {
        const p = wears[wear] ?? livePrices.get(`${q} (${wear})`.toLowerCase());
        if (p != null) wears[wear] = p;
      }
      const vals = WEARS.map((w) => wears[w]).filter((v): v is number => v != null);
      if (vals.length > 0) {
        prices[key] = {
          min: Math.min(...vals),
          max: Math.max(...vals),
          wears,
        };
        priceCache.set(key, {
          wears,
          min: Math.min(...vals),
          max: Math.max(...vals),
          ts: Date.now(),
        });
      }
    }
  }

  // Clean up: remove skins with no prices, fix min/max for single-price items
  for (const key of Object.keys(prices)) {
    const p = prices[key];
    if (p.min === Infinity || p.max === -Infinity) {
      delete prices[key];
    } else if (!p.wears || Object.keys(p.wears).length === 0) {
      delete p.wears; // knife — no wears
    }
  }

  const caseP = (
    staticPrices as Array<{ name: string; price: number }>
  ).find((p) => p.name === caseName);
  if (caseP)
    prices[caseName.toLowerCase()] = { min: caseP.price, max: caseP.price };

  return NextResponse.json({ prices, source: "skincash", ts: now });
}
