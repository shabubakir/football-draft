import { NextRequest, NextResponse } from "next/server";

/**
 * CS2 HIGHER/LOWER — API для генерации раундов.
 *
 * Цены берутся из той же базы, что и основной CS2 Cases:
 *  - live: SkinCash (как в /api/cs2-prices, кэш 7 дней в памяти);
 *  - fallback: статическая база src/lib/data/cs2-prices.json (ножи/кейсы).
 * Не хардкодим цены в клиенте.
 *
 * IMPORTANT: каждый запрос ограниченный по времени (Promise.race + ABORT).
 * Если SkinCash не отвечает — ответим статикой, не вешая сервер.
 */

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 дней
const WEARS = [
  "Factory New",
  "Minimal Wear",
  "Field-Tested",
  "Well-Worn",
  "Battle-Scarred",
] as const;

type PricedItem = {
  n: string; // "AK-47 | Fire Serpent"
  img: string; // Steam image URL
  price: number;
};

type CacheEntry = {
  price: number;
  ts: number;
};

// Кэш: "name (wear)" → цена (live)
let wearPriceCache: Map<string, CacheEntry> = new Map();
// Метки "кейс обработан" + одиночные цены
let singlePriceCache: Map<string, CacheEntry> = new Map();
// Статические цены (ножи/кейсы)
let staticMap: Map<string, number> | null = null;
// Пул предметов (кэшируется после первой загрузки)
let itemPool: PricedItem[] | null = null;

async function loadStatic(): Promise<void> {
  if (staticMap && staticMap.size > 0) return;
  const mod = await import("@/lib/data/cs2-prices.json");
  const arr = (mod.default ?? mod) as Array<{ name: string; price: number }>;
  const m = new Map<string, number>();
  for (const p of arr) {
    m.set(p.name.toLowerCase(), p.price);
  }
  staticMap = m;
}

async function fetchOnePrice(
  marketHashName: string,
  timeoutMs: number
): Promise<number | null> {
  const encoded = encodeURIComponent(marketHashName);
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.skincash.gg/v1/prices/${encoded}`, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (res.status === 404) return null;
    if (res.status === 429 || !res.ok) return null;
    const json = await res.json();
    return typeof json.price === "number" ? json.price : null;
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

function setCache(map: Map<string, CacheEntry>, key: string, price: number): void {
  map.set(key, { price, ts: Date.now() });
}

function fromCache(map: Map<string, CacheEntry>, key: string): number | null {
  const e = map.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) {
    map.delete(key);
    return null;
  }
  return e.price;
}

/**
 * Загружает кэш цен для указанных кейсов.
 * ВАЖНО: ограничено по времени (maxMs). Если не успели — возвращаем то, что есть.
 */
async function ensureWearCache(caseNames: string[], maxMs: number): Promise<void> {
  const started = Date.now();
  const { CASES } = await import("@/lib/cs2");
  const wanted = new Set(caseNames);

  for (const cs of CASES) {
    if (!wanted.has(cs.name)) continue;
    if (fromCache(singlePriceCache, `__case:${cs.name}`) != null) continue;

    // Ограничение на кейс: не дольше maxMs
    const caseBudget = maxMs;
    const names = [
      ...cs.items.map((i) => i.n),
      ...cs.rares.map((r) => r.n),
    ];

    const requests: string[] = [];
    for (const name of names) {
      const isKnife = name.startsWith("\u2605") || name.startsWith("\u2606");
      if (isKnife) {
        requests.push(name);
      } else {
        for (const wear of WEARS) {
          requests.push(`${name} (${wear})`);
        }
      }
    }

    const BATCH = 20;
    for (let i = 0; i < requests.length; i += BATCH) {
      const elapsed = Date.now() - started;
      if (elapsed > caseBudget) break; // не успеваем — выходим
      const batch = requests.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map((q) => fetchOnePrice(q, 4000)) // 4 сек на запрос, без ретраев
      );
      for (let j = 0; j < batch.length; j++) {
        const v = results[j];
        if (v != null && v > 0) {
          setCache(wearPriceCache, batch[j].toLowerCase(), v);
        }
      }
      if (i + BATCH < requests.length) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // Метка: кейс обработан (пусть и частично) — не запрашиваем повторно
    setCache(singlePriceCache, `__case:${cs.name}`, 1);
  }
}

/**
 * Цена предмета: средняя по wears (скин) / одна (нож).
 * live-кэш → статика → null.
 */
function itemPrice(name: string): number | null {
  const lower = name.toLowerCase();
  const isKnife = name.startsWith("\u2605") || name.startsWith("\u2606");

  if (isKnife) {
    const c = fromCache(wearPriceCache, lower);
    if (c != null) return c;
    const s = fromCache(singlePriceCache, lower);
    if (s != null) return s;
    const st = staticMap?.get(lower);
    if (st != null && st > 0) return st;
    return null;
  }

  const prices: number[] = [];
  for (const w of WEARS) {
    const p = fromCache(wearPriceCache, `${lower} (${w})`);
    if (p != null && p > 0) prices.push(p);
  }
  if (prices.length > 0) {
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }
  // Статика не содержит скинов (только кейсы/ножи) — null
  return null;
}

/**
 * Строит пул предметов с ценой (кэшируется).
 */
async function buildPool(caseNames: string[], maxMs: number): Promise<PricedItem[]> {
  if (itemPool && itemPool.length > 0) return itemPool;
  const { CASES } = await import("@/lib/cs2");
  let poolCases = CASES;
  if (caseNames && caseNames.length > 0) {
    const wanted = new Set(caseNames);
    const filtered = CASES.filter((c) => wanted.has(c.name));
    if (filtered.length > 0) poolCases = filtered;
  }
  await ensureWearCache(poolCases.map((c) => c.name), maxMs);

  const all: PricedItem[] = [];
  for (const cs of poolCases) {
    for (const it of cs.items) {
      const p = itemPrice(it.n);
      if (p != null && p > 0) all.push({ n: it.n, img: it.img, price: p });
    }
    for (const r of cs.rares) {
      const p = itemPrice(r.n);
      if (p != null && p > 0) all.push({ n: r.n, img: r.img, price: p });
    }
  }
  if (all.length >= 2) {
    itemPool = all;
  }
  return all;
}

type CompareRound = {
  a: PricedItem;
  b: PricedItem;
};

export async function GET(req: NextRequest) {
  const now = Date.now();
  const roundsN = Math.min(
    30,
    Math.max(1, Number(req.nextUrl.searchParams.get("rounds") ?? 10) || 10)
  );
  const casesParam = req.nextUrl.searchParams.get("cases");
  const caseNames = casesParam
    ? casesParam.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  // Ограничение на весь запрос: 20 секунд (чтобы не вешать сервер)
  const MAX_MS = 20000;

  try {
    await Promise.race([
      loadStatic(),
      new Promise((r) => setTimeout(r, MAX_MS)),
    ]);

    const all = (await Promise.race([
      buildPool(caseNames ?? [], MAX_MS),
      new Promise<PricedItem[]>((resolve) => setTimeout(() => resolve([]), MAX_MS)),
    ])) as PricedItem[];

    if (!all || all.length < 2) {
      return NextResponse.json(
        { error: "Не удалось загрузить цены — попробуйте позже" },
        { status: 503 }
      );
    }

    // Раунды: 2 разных предмета, разница цены >= 5%
    const rounds: CompareRound[] = [];
    let guard = roundsN * 50;
    while (rounds.length < roundsN && guard-- > 0) {
      const i = Math.floor(Math.random() * all.length);
      let j = Math.floor(Math.random() * all.length);
      if (j === i) j = (j + 1) % all.length;
      const A = all[i];
      const B = all[j];
      if (A.n === B.n) continue;
      const diff = Math.abs(A.price - B.price);
      const base = Math.max(A.price, B.price);
      if (base > 0 && diff / base < 0.05) continue;
      rounds.push({ a: A, b: B });
    }

    if (rounds.length === 0) {
      return NextResponse.json(
        { error: "Не удалось сформировать раунды — попробуйте позже" },
        { status: 503 }
      );
    }

    return NextResponse.json({ rounds, source: "skincash+static", ts: now });
  } catch (e) {
    console.error("[cs2-compare] error:", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
