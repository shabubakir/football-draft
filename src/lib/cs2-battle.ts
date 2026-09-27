// CASE BATTLE — общая логика (используется сервером API и клиентом)
// Авторитетность: seed генерируется сервером и хранится в БД (BIGINT).
// Клиент НЕ знает seed — только получает готовый результат открытия по номеру раунда.
// Тот же seed → тот же результат: реванш/ресинк дают идентичную игру.

import { CASES, CS2Case, makeRng, rollCase, getWearFromFloat, OpenResult } from "./cs2";

// ---------- Режимы (архитектура под будущие режимы) ----------
// ID режима: 'classic' сейчас, остальные — задел под будущее
export type BattleModeId = "classic" | "speed" | "high_roller" | "jackpot" | "60sec";

export type BattleMode = {
  id: BattleModeId;
  name: string;
  desc: string;
  bank: number;
  rounds: number;
  available: boolean;
};

export const BATTLE_MODES: BattleMode[] = [
  {
    id: "classic",
    name: "CASE BATTLE",
    desc: "10 открытий · кто наберёт больше",
    bank: 10000,
    rounds: 10,
    available: true,
  },
  {
    id: "speed",
    name: "SPEED BATTLE",
    desc: "Кто первым откроет 10 кейсов",
    bank: 10000,
    rounds: 10,
    available: false,
  },
  {
    id: "high_roller",
    name: "HIGH ROLLER",
    desc: "Кто выбьет самый дорогой предмет",
    bank: 10000,
    rounds: 10,
    available: false,
  },
  {
    id: "jackpot",
    name: "JACKPOT RACE",
    desc: "Первый предмет дороже $500",
    bank: 10000,
    rounds: 10,
    available: false,
  },
  {
    id: "60sec",
    name: "60 SECOND BATTLE",
    desc: "Максимум открытий за 60 секунд",
    bank: 10000,
    rounds: 20,
    available: false,
  },
];

// ---------- Игрок в комнате ----------
export type BattlePlayer = {
  id: string;
  name: string;
  seat: "host" | "guest";
};

// ---------- Результат открытия (для обоих игроков, но с разными ценами) ----------
export type BattleItem = {
  item: string; // "AK-47 | Fire Serpent" (с "★ " для StatTrak/ножей)
  img: string;
  tier: 0 | 1 | 2 | 3 | 4;
  isSt: boolean;
  float: number;
  wear: string; // FN | MW | FT | WW | BS
  // Цена — определяется СЕРВЕРОМ по float (клиент её не присылает)
  price: number; // USD, 0 = цена недоступна (нет данных маркета)
};

export type BattleRound = {
  p1: BattleItem | null; // seat host
  p2: BattleItem | null; // seat guest
  revealed1: boolean; // результат p1 раскрыт для всех (после анимации)
  revealed2: boolean;
};

// ---------- Комната ----------
export type BattleRoom = {
  id: string;
  code: string;
  mode: string;
  status: "waiting" | "playing" | "finished";
  case_name: string;
  bank: number;
  rounds: number;
  match_seed: number;
  players: BattlePlayer[];
  rounds_data: BattleRound[];
  winner: "host" | "guest" | "draw" | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

// ---------- Цена предмета по float ----------
// prices — из /api/cs2-prices?case=... : { min, max, wears?: {en: price} }
// В боевом режиме цена определяется только float → сервер не доверяет клиенту.
export function priceForFloat(
  item: string,
  float: number,
  prices: Record<string, { min: number; max: number; wears?: Record<string, number> }>
): number {
  const p = prices[item.toLowerCase()];
  if (!p || p.min <= 0) return 0;
  // нож/перчатки (без wears) или диапазон = одна цена
  if (p.min === p.max || !p.wears) return p.max;
  // weapon skin: interpolate between wear price buckets by float position
  const ranges: [number, number, string][] = [
    [0.0, 0.07, "Factory New"],
    [0.07, 0.15, "Minimal Wear"],
    [0.15, 0.38, "Field-Tested"],
    [0.38, 0.45, "Well-Worn"],
    [0.45, 1.0, "Battle-Scarred"],
  ];
  let lo: [number, number, string] = ranges[0];
  let hi: [number, number, string] = ranges[0];
  for (const r of ranges) {
    if (float < r[1]) {
      hi = r;
      break;
    }
    lo = r;
  }
  if (lo === hi) {
    const pv = p.wears[hi[2]];
    return pv ?? p.max;
  }
  const loV = p.wears[lo[2]] ?? p.min;
  const hiV = p.wears[hi[2]] ?? p.max;
  const t = (float - lo[0]) / (hi[0] - lo[0] || 1);
  return loV + (hiV - loV) * Math.min(Math.max(t, 0), 1);
}

// ---------- Честное открытие (seed → результат) ----------
// seedBase — общий seed матча (из БД), i — номер раунда 0..rounds-1, seat — 0/1
// Результат ДЕТЕРМИНИРОВАН: один и тот же seed даёт ту же игру на любом клиенте.
export function rollRound(
  caseDef: CS2Case,
  seedBase: number,
  roundIdx: number,
  seat: 0 | 1,
  prices: Record<string, { min: number; max: number; wears?: Record<string, number> }>
): BattleItem | null {
  const rng = makeRng(`cs2battle|${seedBase}|${roundIdx}|${seat}`);
  const res: OpenResult = rollCase(caseDef, rng);
  const price = priceForFloat(res.item, res.float, prices);
  return {
    item: res.item,
    img: res.img,
    tier: res.tier,
    isSt: res.isSt,
    float: res.float,
    wear: getWearFromFloat(res.float),
    price,
  };
}

// ---------- Генерация кода комнаты ----------
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeBattleCode(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

// ---------- Статистика матча ----------
export type PlayerStats = {
  total: number; // общая стоимость
  opened: number;
  best: BattleItem | null; // самый дорогой
  bestPrice: number;
  avg: number; // средняя стоимость открытия
};

export function playerStats(rounds: BattleRound[], seat: 0 | 1): PlayerStats {
  const items = rounds
    .map((r) => (seat === 0 ? r.p1 : r.p2))
    .filter((x): x is BattleItem => x != null);
  const total = items.reduce((s, i) => s + i.price, 0);
  const best = items.reduce<BattleItem | null>((b, i) => (b == null || i.price > b.price ? i : b), null);
  return {
    total,
    opened: items.length,
    best,
    bestPrice: best?.price ?? 0,
    avg: items.length ? total / items.length : 0,
  };
}

// ---------- Утилиты ----------
export function findCase(name: string): CS2Case | undefined {
  return CASES.find((c) => c.name === name);
}

export function fmtMoney(v: number): string {
  if (v >= 1000) return "$" + Math.round(v).toLocaleString("ru-RU");
  if (v >= 100) return "$" + v.toFixed(0);
  return "$" + v.toFixed(2);
}
