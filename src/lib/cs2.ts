// CS2 Case Opening Simulator — движок
// Реальные шансы Valve: Mil-Spec 79.92%, Restricted 15.98%, Classified 3.20%, Covert 0.64%, Rare Special 0.26%
import casesData from "./data/cs2-cases.json";

// ---------- Типы ----------
export type Tier = 0 | 1 | 2 | 3; // 0=Mil-Spec, 1=Restricted, 2=Classified, 3=Covert

export type CaseItem = {
  n: string; // "AK-47 | Fire Serpent"
  t: Tier;
  img: string; // Steam image URL
};

export type CaseRare = {
  n: string; // "Karambit | Doppler"
  img: string;
};

export type CS2Case = {
  name: string;
  short: string;
  year: string;
  img: string; // case image URL
  items: CaseItem[];
  rares: CaseRare[];
};

export const CASES: CS2Case[] = casesData as CS2Case[];

// ---------- Константы Valve ----------
export const RARITY_ODDS = {
  0: 0.7992, // Mil-Spec
  1: 0.1598, // Restricted
  2: 0.032, // Classified
  3: 0.0064, // Covert
  4: 0.0026, // Rare Special (knife/glove)
};

export const RARITY_NAMES = [
  "МИЛ-СПЕК",
  "ОГРАНИЧЕННЫЙ",
  "СЕКРЕТНЫЙ",
  "СКРЫТЫЙ",
  "НОЖ / ПЕРЧАТКИ",
] as const;

export const RARITY_COLORS = [
  "#4b69ff", // blue
  "#8847ff", // purple
  "#d32ce6", // pink
  "#eb4b4b", // red
  "#ffd700", // gold
] as const;

export const RARITY_BG = [
  "from-[#4b69ff]/20 to-[#4b69ff]/5",
  "from-[#8847ff]/20 to-[#8847ff]/5",
  "from-[#d32ce6]/20 to-[#d32ce6]/5",
  "from-[#eb4b4b]/20 to-[#eb4b4b]/5",
  "from-[#ffd700]/20 to-[#ffd700]/5",
] as const;

// ---------- Результат открытия ----------
export type OpenResult = {
  tier: Tier | 4; // 4 = rare special
  item: string; // name of the skin or knife
  img: string; // image URL
  isSt: boolean; // StatTrak
};

// ---------- RNG ----------
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return mulberry32(h);
}

// ---------- Определение результата ----------
// Правильный порядок: сначала решаем РЕЗУЛЬТАТ, потом анимируем к нему
export function rollCase(caseDef: CS2Case, rng: () => number = Math.random): OpenResult {
  const roll = rng();

  // 1. Определяем тир
  let tier: Tier | 4;
  let rem = roll;
  if (rem < RARITY_ODDS[4]) {
    tier = 4;
  } else if ((rem -= RARITY_ODDS[4]) < RARITY_ODDS[3]) {
    tier = 3;
  } else if ((rem -= RARITY_ODDS[3]) < RARITY_ODDS[2]) {
    tier = 2;
  } else if ((rem -= RARITY_ODDS[2]) < RARITY_ODDS[1]) {
    tier = 1;
  } else {
    tier = 0;
  }

  // 2. Выбор предмета внутри тира
  let item: string;
  let img: string;
  if (tier === 4) {
    // Rare special: knife or glove
    const rare = caseDef.rares[Math.floor(rng() * caseDef.rares.length)];
    item = rare?.n ?? "★ Knife";
    img = rare?.img ?? "";
  } else {
    const pool = caseDef.items.filter((i) => i.t === tier);
    const picked = pool.length > 0 ? pool[Math.floor(rng() * pool.length)] : caseDef.items[0];
    item = picked.n;
    img = picked.img;
  }

  // 3. StatTrak ~10% для eligible items (не для ножей/перчаток)
  const isSt = tier < 4 && rng() < 0.1;

  return { tier, item: isSt ? "★ " + item : item, img, isSt };
}

// ---------- Генерация трека для анимации ----------
// Трек: 120 ячеек, результат ставится на заданную позицию
export type TrackCell = {
  label: string;
  img: string;
  tier: Tier | 4;
  color: string;
};

export type TrackData = {
  cells: TrackCell[];
  targetIndex: number;
};

export function buildTrack(
  caseDef: CS2Case,
  result: OpenResult,
  targetIndex: number,
  rng: () => number = Math.random
): TrackData {
  const TOTAL = 120;

  const cells: TrackCell[] = [];

  for (let i = 0; i < TOTAL; i++) {
    if (i === targetIndex) {
      // Результат
      cells.push({
        label: result.item,
        img: result.img,
        tier: result.tier,
        color: RARITY_COLORS[result.tier],
      });
      continue;
    }

    // Остальные ячейки — случайные по реальным шансам
    const r = rng();
    let t: Tier | 4;
    if (r < RARITY_ODDS[4]) t = 4;
    else if (r < RARITY_ODDS[4] + RARITY_ODDS[3]) t = 3;
    else if (r < RARITY_ODDS[4] + RARITY_ODDS[3] + RARITY_ODDS[2]) t = 2;
    else if (r < RARITY_ODDS[4] + RARITY_ODDS[3] + RARITY_ODDS[2] + RARITY_ODDS[1]) t = 1;
    else t = 0;

    let label: string;
    let img: string;
    if (t === 4) {
      const rare = caseDef.rares[Math.floor(rng() * caseDef.rares.length)];
      label = rare?.n ?? "★ Knife";
      img = rare?.img ?? "";
    } else {
      const pool = caseDef.items.filter((i) => i.t === t);
      const picked = pool.length > 0 ? pool[Math.floor(rng() * pool.length)] : caseDef.items[0];
      label = picked.n;
      img = picked.img;
    }

    cells.push({ label, img, tier: t, color: RARITY_COLORS[t] });
  }

  return { cells, targetIndex };
}

// ---------- XP ----------
export const CS2_XP = {
  open_1: 10, // каждое открытие
  knife: 50, // выпал нож/перчатки
  covert: 20, // выпал covert
};
