import { NextRequest, NextResponse } from "next/server";

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory cache: skin name (lowercase) → { min, max } price range
let priceCache: Map<string, { min: number; max: number; ts: number }> = new Map();

const WEARS = [
  "Factory New",
  "Minimal Wear",
  "Field-Tested",
  "Well-Worn",
  "Battle-Scarred",
] as const;

/**
 * Fetch prices for all 5 wear variants of a skin from SkinCash.
 * Returns { min, max } range. Knives/gloves have no wear → single price.
 */
async function fetchPriceRange(
  name: string
): Promise<{ min: number; max: number } | null> {
  const key = name.toLowerCase();
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { min: cached.min, max: cached.max };
  }

  // Knives/gloves (★ prefix) have no wear variants
  const isKnife = name.startsWith("\u2605") || name.startsWith("\u2606");
  if (isKnife) {
    try {
      const encoded = encodeURIComponent(name);
      const res = await fetch(`https://api.skincash.gg/v1/prices/${encoded}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`SkinCash: ${res.status}`);
      const json = await res.json();
      if (typeof json.price === "number") {
        priceCache.set(key, { min: json.price, max: json.price, ts: Date.now() });
        return { min: json.price, max: json.price };
      }
    } catch {
      // ignore
    }
    return null;
  }

  // Weapon skin: fetch all 5 wear variants
  const prices: number[] = [];
  const results = await Promise.allSettled(
    WEARS.map(async (wear) => {
      const candidate = `${name} (${wear})`;
      const encoded = encodeURIComponent(candidate);
      const res = await fetch(`https://api.skincash.gg/v1/prices/${encoded}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      const json = await res.json();
      return typeof json.price === "number" ? json.price : null;
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled" && r.value != null) {
      prices.push(r.value);
    }
  }

  if (prices.length === 0) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  priceCache.set(key, { min, max, ts: Date.now() });
  return { min, max };
}

// Static case prices
import staticPrices from "@/lib/data/cs2-prices.json";

export async function GET(req: NextRequest) {
  const now = Date.now();
  const caseName = req.nextUrl.searchParams.get("case");

  if (!caseName) {
    // No case specified → return static case prices
    const prices: Record<string, number> = {};
    for (const p of staticPrices as Array<{ name: string; price: number }>) {
      prices[p.name.toLowerCase()] = p.price;
    }
    return NextResponse.json({ prices, source: "static", ts: now });
  }

  // Case specified → fetch price ranges for all skins in that case
  const { CASES } = await import("@/lib/cs2");
  const cs = CASES.find((c) => c.name === caseName);
  if (!cs) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const allItems: string[] = [
    ...cs.items.map((i) => i.n),
    ...cs.rares.map((r) => r.n),
  ];

  const prices: Record<string, { min: number; max: number }> = {};
  const BATCH = 8;
  for (let i = 0; i < allItems.length; i += BATCH) {
    const batch = allItems.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((name) => fetchPriceRange(name))
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === "fulfilled" && r.value != null) {
        prices[batch[j].toLowerCase()] = r.value;
      }
    }
    if (i + BATCH < allItems.length) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  // Include case price as { min: X, max: X }
  const caseP = (
    staticPrices as Array<{ name: string; price: number }>
  ).find((p) => p.name === caseName);
  if (caseP) prices[caseName.toLowerCase()] = { min: caseP.price, max: caseP.price };

  return NextResponse.json({ prices, source: "skincash", ts: now });
}
