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
  "Армейское качество",
  "Запрещённое",
  "Засекреченное",
  "Тайное",
  "Редкое",
] as const;

// ---------- Износ (Wear) — float-диапазоны и русские названия ----------
export type WearType = "FN" | "MW" | "FT" | "WW" | "BS";

export const WEAR_RANGES: Record<WearType, { min: number; max: number; ru: string; en: string }> = {
  FN: { min: 0.0, max: 0.07, ru: "Прямо с завода", en: "Factory New" },
  MW: { min: 0.07, max: 0.15, ru: "Немного поношенное", en: "Minimal Wear" },
  FT: { min: 0.15, max: 0.38, ru: "После полевых испытаний", en: "Field-Tested" },
  WW: { min: 0.38, max: 0.45, ru: "Поношенное", en: "Well-Worn" },
  BS: { min: 0.45, max: 1.0, ru: "Закалённое в боях", en: "Battle-Scarred" },
};

/**
 * Determine wear type from a float value.
 */
export function getWearFromFloat(float: number): WearType {
  if (float < 0.07) return "FN";
  if (float < 0.15) return "MW";
  if (float < 0.38) return "FT";
  if (float < 0.45) return "WW";
  return "BS";
}

/**
 * Format wear range for display: "FN 0.00–0.07"
 */
export function formatWearRange(wear: WearType): string {
  const r = WEAR_RANGES[wear];
  return `${wear} ${r.min.toFixed(2)}–${r.max.toFixed(2)}`;
}

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

// ---------- Ножи и перчатки в нашей базе без префикса ★ ----------
// В CS2 market hash name ножей/перчаток всегда начинается с "★ " (например
// "★ Karambit | Fade", "★ Sport Gloves | Vice"). База cs2-cases.json хранит их
// без звёздочки — для запроса цен в SkinCash нужно восстанавливать префикс.
const KNIFE_BASES = new Set<string>([
  "Bayonet", "Flip Knife", "Gut Knife", "Karambit", "M9 Bayonet",
  "Bowie Knife", "Huntsman Knife", "Falchion Knife", "Shadow Daggers",
  "Bonesaw", "Butterfly Knife", "Stiletto Knife", "Talon Knife",
  "Ursus Knife", "Nomad Knife", "Classic Knife", "Skeleton Knife",
  "Survival Knife", "Paracord Knife", "Navaja Knife", "Kukri Knife",
  "Glide Knife",
]);
const GLOVE_BASES = new Set<string>([
  "Driver Gloves", "Sport Gloves", "Specialist Gloves", "Hand Wraps",
  "Moto Gloves", "Hydra Gloves", "Bloodhound Gloves", "Broken Fang Gloves",
  "Modern Hands",
]);

export function isKnifeOrGloves(name: string): boolean {
  const base = name.split(" | ")[0];
  return KNIFE_BASES.has(base) || GLOVE_BASES.has(base);
}

/**
 * Market hash name для запроса цен в SkinCash:
 * нож/перчатки → "★ Name"; обычный скин → имя как есть.
 */
export function marketHashName(name: string): string {
  return isKnifeOrGloves(name) ? "★ " + name : name;
}

/**
 * SkinCash НЕ знает ножи с финишем: "★ Karambit | Doppler" → 404,
 * а базовые "★ Karambit" → цена есть. Поэтому все финиши одного ножа
 * получают цену базовой модели.
 * Для перчаток SkinCash ничего не знает → возвращаем null.
 */
export function knifePriceQuery(name: string): string | null {
  if (!isKnifeOrGloves(name)) return null;
  const base = name.split(" | ")[0];
  return GLOVE_BASES.has(base) ? null : "★ " + base;
}

/**
 * Имя для запроса цены скина: StatTrak™ добавляется в начало.
 * StatTrak-скины в наших данных приходят с префиксом "★ " (см. rollCase).
 */
export function skinPriceQuery(name: string): string {
  if (isKnifeOrGloves(name)) return name;
  const n = name.startsWith("★ ") ? name.slice(2) : name;
  if (n.startsWith("StatTrak")) return n;
  return "StatTrak™ " + n;
}

// ---------- Результат открытия ----------
export type OpenResult = {
  tier: Tier | 4; // 4 = rare special
  item: string; // name of the skin or knife
  img: string; // image URL
  isSt: boolean; // StatTrak
  float: number; // 0.00 – 1.00
  wear: WearType; // FN / MW / FT / WW / BS
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

  // 4. Float: равномерное распределение 0.00 – 1.00
  const float = rng();
  const wear = getWearFromFloat(float);

  return { tier, item: isSt ? "★ " + item : item, img, isSt, float, wear };
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

  // Pre-compute pools per tier
  const pools: CaseItem[][] = [0, 1, 2, 3].map(
    (t) => caseDef.items.filter((i) => i.t === t)
  );
  const rares = caseDef.rares;

  function pickItem(t: Tier | 4): { label: string; img: string } {
    if (t === 4) {
      const rare = rares[Math.floor(rng() * rares.length)];
      return { label: rare?.n ?? "★ Knife", img: rare?.img ?? "" };
    }
    const pool = pools[t];
    const picked = pool.length > 0 ? pool[Math.floor(rng() * pool.length)] : caseDef.items[0];
    return { label: picked.n, img: picked.img };
  }

  // Phase 1: fill 120 slots with real odds
  const cells: TrackCell[] = [];
  for (let i = 0; i < TOTAL; i++) {
    if (i === targetIndex) {
      cells.push({
        label: result.item,
        img: result.img,
        tier: result.tier,
        color: RARITY_COLORS[result.tier],
      });
      continue;
    }
    const r = rng();
    let t: Tier | 4;
    if (r < RARITY_ODDS[4]) t = 4;
    else if (r < RARITY_ODDS[4] + RARITY_ODDS[3]) t = 3;
    else if (r < RARITY_ODDS[4] + RARITY_ODDS[3] + RARITY_ODDS[2]) t = 2;
    else if (r < RARITY_ODDS[4] + RARITY_ODDS[3] + RARITY_ODDS[2] + RARITY_ODDS[1]) t = 1;
    else t = 0;

    const { label, img } = pickItem(t);
    cells.push({ label, img, tier: t, color: RARITY_COLORS[t] });
  }

  // Phase 2: visual variety — guarantee each tier has at least 2 visible distinct skins
  // Pick 3 random non-target indices per tier and force-distinct them
  const MIN_VARIETY = 2; // extra distinct skins per tier (beyond the random ones)
  for (const t of [0, 1, 2, 3, 4] as Array<Tier | 4>) {
    // Find all indices of this tier (excluding target)
    const idx: number[] = [];
    for (let i = 0; i < TOTAL; i++) {
      if (i === targetIndex) continue;
      if (cells[i].tier === t) idx.push(i);
    }
    if (idx.length < 2) continue;

    // Shuffle idx
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }

    // Force distinct skins in MIN_VARIETY slots
    const seen = new Set<string>();
    let filled = 0;
    for (const i of idx) {
      if (filled >= MIN_VARIETY) break;
      const { label, img } = pickItem(t);
      if (seen.has(label)) continue;
      seen.add(label);
      cells[i] = { label, img, tier: t, color: RARITY_COLORS[t] };
      filled++;
    }
  }

  // Phase 3: sprinkle a few "lucky" high-tier cards among Mil-Spec for visual pop
  // (like real CS2 case-opening sites show rare items in the roulette)
  const luckyCount = 3 + Math.floor(rng() * 3); // 3-5 lucky cards
  for (let n = 0; n < luckyCount; n++) {
    const i = Math.floor(rng() * TOTAL);
    if (i === targetIndex) continue;
    // Upgrade to a higher tier
    const luckyTier = (2 + Math.floor(rng() * 2)) as Tier; // Classified or Covert
    const { label, img } = pickItem(luckyTier);
    cells[i] = { label, img, tier: luckyTier, color: RARITY_COLORS[luckyTier] };
  }

  return { cells, targetIndex };
}

// ---------- XP ----------
export const CS2_XP = {
  open_1: 10, // каждое открытие
  knife: 50, // выпал нож/перчатки
  covert: 20, // выпал covert
};
