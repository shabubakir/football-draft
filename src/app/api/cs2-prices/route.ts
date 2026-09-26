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

async function fetchOnePrice(
  marketHashName: string,
  retries = 2
): Promise<number | null> {
  const encoded = encodeURIComponent(marketHashName);
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`https://api.skincash.gg/v1/prices/${encoded}`, {
        headers: { Accept: "application/json" },
      });
      if (res.status === 404) return null;
      if (res.status === 429) {
        // Rate limited — wait and retry
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return null;
      }
      if (!res.ok) return null;
      const json = await res.json();
      return typeof json.price === "number" ? json.price : null;
    } catch {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      return null;
    }
  }
  return null;
}

/**
 * Fetch prices for all 5 wear variants of a skin from SkinCash.
 * Knives/gloves have no wear → single price.
 */
async function fetchPriceRange(
  name: string
): Promise<PriceEntry | null> {
  const key = name.toLowerCase();
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached;
  }

  // Knives/gloves (★ prefix) have no wear variants
  const isKnife = name.startsWith("\u2605") || name.startsWith("\u2606");
  if (isKnife) {
    const price = await fetchOnePrice(name);
    if (price == null) return null;
    const entry: PriceEntry = { single: price, min: price, max: price, ts: Date.now() };
    priceCache.set(key, entry);
    return entry;
  }

  // Weapon skin: fetch all 5 wear variants
  const results = await Promise.allSettled(
    WEARS.map((wear) => fetchOnePrice(`${name} (${wear})`))
  );

  const wears: Record<string, number> = {};
  const allPrices: number[] = [];
  for (let i = 0; i < WEARS.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled" && r.value != null) {
      wears[WEARS[i]] = r.value;
      allPrices.push(r.value);
    }
  }

  if (allPrices.length === 0) return null;

  const entry: PriceEntry = {
    wears,
    min: Math.min(...allPrices),
    max: Math.max(...allPrices),
    ts: Date.now(),
  };
  priceCache.set(key, entry);
  return entry;
}

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

  const { CASES } = await import("@/lib/cs2");
  const cs = CASES.find((c) => c.name === caseName);
  if (!cs) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const allItems: string[] = [
    ...cs.items.map((i) => i.n),
    ...cs.rares.map((r) => r.n),
  ];

  const prices: Record<
    string,
    { min: number; max: number; wears?: Record<string, number> }
  > = {};

  // Fetch ALL wear variants in parallel (40 skins × 5 wears = 200 requests)
  // SkinCash has no documented rate limit; batch to be safe
  const allWearRequests: { name: string; wear: string }[] = [];
  for (const name of allItems) {
    const isKnife = name.startsWith("\u2605") || name.startsWith("\u2606");
    if (isKnife) {
      allWearRequests.push({ name, wear: "" });
    } else {
      for (const wear of WEARS) {
        allWearRequests.push({ name, wear });
      }
    }
  }

  const BATCH = 20;
  for (let i = 0; i < allWearRequests.length; i += BATCH) {
    const batch = allWearRequests.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(({ name, wear }) =>
        fetchOnePrice(wear ? `${name} (${wear})` : name)
      )
    );
    // Accumulate per-skin, per-wear prices
    for (let j = 0; j < batch.length; j++) {
      const r = results[j];
      if (r.status !== "fulfilled" || r.value == null) continue;
      const { name, wear } = batch[j];
      const key = name.toLowerCase();
      if (!prices[key]) {
        prices[key] = { min: Infinity, max: -Infinity, wears: {} };
      }
      if (wear) {
        prices[key].wears![wear] = r.value;
      }
      prices[key].min = Math.min(prices[key].min, r.value);
      prices[key].max = Math.max(prices[key].max, r.value);
    }
    if (i + BATCH < allWearRequests.length) {
      await new Promise((r) => setTimeout(r, 300));
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
