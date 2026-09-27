import { NextRequest, NextResponse } from "next/server";

/**
 * CS2 HIGHER/LOWER — API для генерации раундов.
 *
 * Цены: SkinCash (live, кэш 7 дней в памяти модуля) + статический fallback
 * (src/lib/data/cs2-prices.json — только ножи/кейсы).
 *
 * Оптимизация: вместо 2500+ запросов на первый вызов берём СЛУЧАЙНЫЙ поднабор
 * ~120 цен на запрос (батчи по 20, параллельно через CONNECT-прокси).
 * Если у случайно выбранного предмета цены нет (не в кэше, не в статике) —
 * раунд просто пересобирается. Ответ < 10 сек.
 */

import { CASES } from "@/lib/cs2";
import { skincashPrices } from "@/lib/skincash";

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

type CacheEntry = { price: number; ts: number };

// Кэш цен: "market_hash_name" (lower) → { price, ts }
let priceCache: Map<string, CacheEntry> = new Map();
// "Ножи без цены" — не запрашиваем повторно в рамках TTL
let missCache: Map<string, number> = new Map();
// Статические цены (ножи/кейсы)
let staticMap: Map<string, number> | null = null;
// Пул всех скинов/ножей (имя + img) — строится один раз
let allItems: Array<{ n: string; img: string }> | null = null;

async function loadStatic(): Promise<void> {
  if (staticMap && staticMap.size > 0) return;
  const mod = await import("@/lib/data/cs2-prices.json");
  const arr = (mod.default ?? mod) as Array<{ name: string; price: number }>;
  const m = new Map<string, number>();
  for (const p of arr) {
    if (typeof p.price === "number" && p.price > 0) {
      m.set(p.name.toLowerCase(), p.price);
    }
  }
  staticMap = m;
}

function isKnife(name: string): boolean {
  return name.startsWith("\u2605") || name.startsWith("\u2606");
}

/** Все уникальные предметы всех кейсов (нужен img). */
function buildAllItems(): Array<{ n: string; img: string }> {
  if (allItems && allItems.length > 0) return allItems;
  const seen = new Set<string>();
  const list: Array<{ n: string; img: string }> = [];
  for (const cs of CASES) {
    for (const it of cs.items) {
      if (!seen.has(it.n.toLowerCase())) {
        seen.add(it.n.toLowerCase());
        list.push({ n: it.n, img: it.img });
      }
    }
    for (const r of cs.rares) {
      if (!seen.has(r.n.toLowerCase())) {
        seen.add(r.n.toLowerCase());
        list.push({ n: r.n, img: r.img });
      }
    }
  }
  allItems = list;
  return list;
}

function fromCache(key: string): number | null {
  const e = priceCache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) {
    priceCache.delete(key);
    return null;
  }
  return e.price;
}

/**
 * Цена предмета: кэш → статика (ножи) → null.
 * Среднее по 5 wears для скинов, одиночная цена для ножей.
 */
function priceFromCache(name: string): number | null {
  const lower = name.toLowerCase();
  if (isKnife(name)) {
    const c = fromCache(lower);
    if (c != null && c > 0) return c;
    const s = staticMap?.get(lower);
    if (s != null && s > 0) return s;
    return null;
  }
  const prices: number[] = [];
  for (const w of WEARS) {
    const p = fromCache(`${lower} (${w})`.toLowerCase());
    if (p != null && p > 0) prices.push(p);
  }
  if (prices.length > 0) {
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }
  return null;
}

/**
 * Живые цены для СЛУЧАЙНОГО поднабора предметов.
 * Возвращает true, если удалось поставить хотя бы одну цену.
 */
async function fetchLiveSubset(
  items: Array<{ n: string; img: string }>,
  count: number,
  totalMs: number
): Promise<boolean> {
  // Кандидаты: те, у кого цены НЕТ
  const candidates = items.filter((it) => priceFromCache(it.n) == null);
  if (candidates.length === 0) return true;

  // Перемешиваем
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const take = candidates.slice(0, count);

  // Запросы: скин → 5 wears, нож → 1
  const targets: Array<{ name: string; mhn: string[] }> = [];
  for (const it of take) {
    const mhn = isKnife(it.n) ? [it.n] : WEARS.map((w) => `${it.n} (${w})`);
    targets.push({ name: it.n, mhn });
  }
  const flat = targets.flatMap((t) => t.mhn);

  // Отфильтруем то, что уже в кэше / помечено как "нет"
  const toFetch = flat.filter((m) => {
    const lower = m.toLowerCase();
    if (fromCache(lower) != null) return false;
    const missAt = missCache.get(lower);
    if (missAt != null && Date.now() - missAt < 60_000) return false;
    return true;
  });
  const fetched = await skincashPrices(toFetch, {
    perRequestMs: 6000,
    totalMs,
  });

  // Раскладываем: кладём свежие цены в кэш под market hash names
  let setCount = 0;
  const now = Date.now();
  for (const t of targets) {
    let got = 0;
    for (const m of t.mhn) {
      const p = fetched.get(m.toLowerCase());
      if (p != null && p > 0) {
        priceCache.set(m.toLowerCase(), { price: p, ts: now });
        got++;
      }
    }
    if (got > 0) {
      setCount++;
    } else if (priceFromCache(t.name) == null) {
      // Ничего не получили — помечаем, чтобы не дёргать 60 сек
      for (const m of t.mhn) {
        missCache.set(m.toLowerCase(), now);
      }
    }
  }
  return setCount > 0;
}

type CompareRound = { a: PricedItem; b: PricedItem };

/**
 * Генерация N раундов из предметов с известной ценой.
 * - предметы НЕ повторяются между раундами;
 * - разница цен между A и B >= 5% (чтобы было угадываемо).
 * Если предметов не хватает на N*2 — вернём, сколько смогли.
 */
function buildRounds(priced: PricedItem[], n: number): CompareRound[] {
  const rounds: CompareRound[] = [];
  const used = new Set<string>(); // имена предметов, уже использованные

  // Перемешанный пул
  const pool = priced.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Итерации: в каждой проходим по пулу и собираем пары
  for (let pass = 0; pass < 10 && rounds.length < n; pass++) {
    for (let i = 0; i + 1 < pool.length && rounds.length < n; i += 2) {
      const A = pool[i];
      const B = pool[i + 1];
      const key = A.n.toLowerCase();
      if (used.has(key) || used.has(B.n.toLowerCase())) continue;
      const diff = Math.abs(A.price - B.price);
      const base = Math.max(A.price, B.price);
      if (base > 0 && diff / base < 0.05) continue;
      used.add(key);
      used.add(B.n.toLowerCase());
      rounds.push({ a: A, b: B });
    }
    // Перемешиваем заново, чтобы на следующем проходе были другие пары
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }
  return rounds;
}

export async function GET(req: NextRequest) {
  const started = Date.now();
  const roundsN = Math.min(
    30,
    Math.max(1, Number(req.nextUrl.searchParams.get("rounds") ?? 10) || 10)
  );
  const casesParam = req.nextUrl.searchParams.get("cases");
  const caseNames = casesParam
    ? casesParam.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  try {
    await Promise.race([
      loadStatic(),
      new Promise((r) => setTimeout(r, 3000)),
    ]);

    // Пул кандидатов
    let items = buildAllItems();
    if (caseNames && caseNames.length > 0) {
      const wanted = new Set(caseNames);
      const inCases = new Set<string>();
      const imgs = new Map<string, string>();
      for (const cs of CASES) {
        if (!wanted.has(cs.name)) continue;
        for (const it of cs.items) {
          inCases.add(it.n);
          imgs.set(it.n, it.img);
        }
        for (const r of cs.rares) {
          inCases.add(r.n);
          imgs.set(r.n, r.img);
        }
      }
      items = items.filter((it) => inCases.has(it.n));
      if (items.length < 4) {
        return NextResponse.json(
          { error: "В выбранных кейсах недостаточно предметов" },
          { status: 400 }
        );
      }
    }

    const MAX_MS = 18000;

    // Итеративно: цены есть → собираем раунды; нет → добираем live-цены
    let priced: PricedItem[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      const remaining = MAX_MS - (Date.now() - started);
      if (remaining <= 500) break;

      priced = items
        .map((it) => {
          const p = priceFromCache(it.n);
          return p != null && p > 0 ? { n: it.n, img: it.img, price: p } : null;
        })
        .filter((x): x is PricedItem => x != null);

      const rounds = priced.length >= 2 ? buildRounds(priced, roundsN) : [];
      if (rounds.length >= roundsN) {
        return NextResponse.json({
          rounds,
          source: "skincash+static",
          ts: Date.now(),
        });
      }

      // Нужно больше цен — берём случайный поднабор (120 штук на попытку)
      const takeCount = attempt === 0 ? 120 : 80;
      const ok = await fetchLiveSubset(items, takeCount, remaining - 300);
      if (!ok) break;
    }

    if (priced.length < 2) {
      return NextResponse.json(
        { error: "Не удалось загрузить цены — попробуйте позже" },
        { status: 503 }
      );
    }

    const rounds = buildRounds(priced, roundsN);
    if (rounds.length === 0) {
      return NextResponse.json(
        { error: "Не удалось сформировать раунды — попробуйте позже" },
        { status: 503 }
      );
    }

    return NextResponse.json({
      rounds,
      source: "skincash+static",
      ts: Date.now(),
    });
  } catch (e) {
    console.error("[cs2-compare] error:", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
