import { NextRequest, NextResponse } from "next/server";

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory cache: skin name (lowercase) → price
let priceCache: Map<string, { price: number; ts: number }> = new Map();

/**
 * Fetch a single skin price from SkinCash API (free, no key, CORS-open).
 * https://skincash.gg/en/developers
 * 
 * Our JSON stores names without wear (e.g. "MP7 | Skulls"),
 * but SkinCash requires market_hash_name with wear (e.g. "MP7 | Skulls (Field-Tested)").
 * We try Field-Tested first (most common listing), then Factory New.
 */
async function fetchPrice(name: string): Promise<number | null> {
  const key = name.toLowerCase();
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.price;
  }

  // Add wear suffix if not present
  const hasWear = /\(Field-Tested\)|\(Factory New\)|\(Minimal Wear\)|\(Well-Worn\)/.test(name);
  const candidates = hasWear
    ? [name]
    : [`${name} (Field-Tested)`, `${name} (Factory New)`];

  for (const candidate of candidates) {
    try {
      const encoded = encodeURIComponent(candidate);
      const res = await fetch(`https://api.skincash.gg/v1/prices/${encoded}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      });
      if (res.status === 404) continue;
      if (!res.ok) throw new Error(`SkinCash: ${res.status}`);
      const json = await res.json();
      const price = typeof json.price === "number" ? json.price : null;
      if (price != null) {
        priceCache.set(key, { price, ts: Date.now() });
        return price;
      }
    } catch {
      // Try next candidate
    }
  }
  return null;
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

  // Case specified → fetch prices for all skins in that case
  const { CASES } = await import("@/lib/cs2");
  const cs = CASES.find((c) => c.name === caseName);
  if (!cs) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const allItems: string[] = [
    ...cs.items.map((i) => i.n),
    ...cs.rares.map((r) => r.n),
  ];

  const prices: Record<string, number> = {};
  const BATCH = 10;
  for (let i = 0; i < allItems.length; i += BATCH) {
    const batch = allItems.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((name) => fetchPrice(name))
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === "fulfilled" && r.value != null) {
        prices[batch[j].toLowerCase()] = r.value;
      }
    }
    if (i + BATCH < allItems.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Include case price
  const caseP = (
    staticPrices as Array<{ name: string; price: number }>
  ).find((p) => p.name === caseName);
  if (caseP) prices[caseName.toLowerCase()] = caseP.price;

  return NextResponse.json({ prices, source: "skincash", ts: now });
}
