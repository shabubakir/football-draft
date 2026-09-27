// ============================================================
// GEOGUESSR LITE — игровой движок (чистые функции, без React)
// Отдельный модуль: можно удалить каталог src/games/geoguessr
// и route src/app/geoguessr, не затрагивая остальной сайт.
// ============================================================

// ---- Типы данных ----

export type GeoMode =
  | "CLASSIC" // реализовано
  | "DAILY" // зарезервировано: одна сетка на всех по дате
  | "DUEL" // зарезервировано
  | "COUNTRY_STREAK" // зарезервировано
  | "CITIES" // зарезервировано
  | "FOOTBALL_STADIUMS" // зарезервировано; см. поле kind: "stadium"

export interface GeoLocation {
  id: string;
  image: string; // путь к фото (должно соответствовать координатам)
  latitude: number;
  longitude: number;
  country: string; // ru
  city: string; // ru
  description: string; // ru
  kind?: "city" | "landmark" | "stadium" | "airport" | "nature" | "plaza";
}

export interface GeoRoundResult {
  location: GeoLocation;
  guess: { latitude: number; longitude: number };
  distanceKm: number;
  points: number;
}

export interface GeoGameResult {
  mode: GeoMode;
  total: number;
  maxTotal: number;
  rounds: GeoRoundResult[];
  avgDistanceKm: number;
  bestRound: number;
  /** id локации — для DAILY (одинаковая сетка на всех) */
  seed?: string;
}

export interface GeoStats {
  gamesPlayed: number;
  bestScore: number;
  totalScore: number;
  roundsPlayed: number;
  totalDistanceKm: number; // сумма расстояний (для среднего)
  perfect: number; // <= 1 км
  nearPerfect: number; // <= 10 км
  lastPlayedAt: number | null;
}

// ---- Константы ----

export const ROUNDS_PER_GAME = 5;
export const MAX_ROUND_POINTS = 1000;

// ---- Дистанция ----

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // км
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// ---- Очки: плавная экспонента, привязанная к требуемым диапазонам ----
// 0 км → 1000 | ~0.5 км → ~950 | 2 км → ~850 | 10 км → ~700
// 50 км → ~500 | 200 км → ~250 | 1000 км → ~28 | дальше → →0

export function pointsForDistance(km: number): number {
  const clamped = Math.max(0, km);
  const p = 1000 * Math.exp(-clamped / 260);
  return Math.max(0, Math.min(MAX_ROUND_POINTS, Math.round(p)));
}

// ---- Сетка раундов ----

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Классическая игра: 5 случайных локаций, не повторяющихся. */
export function pickClassicRound(
  pool: GeoLocation[],
  usedIds: Set<string>
): GeoLocation {
  const available = pool.filter((l) => !usedIds.has(l.id));
  const source = available.length > 0 ? available : pool;
  return source[Math.floor(Math.random() * source.length)];
}

// ---- Итоги игры ----

export function finishGame(
  rounds: GeoRoundResult[],
  mode: GeoMode = "CLASSIC"
): GeoGameResult {
  const total = rounds.reduce((s, r) => s + r.points, 0);
  const maxTotal = rounds.length * MAX_ROUND_POINTS;
  const avgDistanceKm =
    rounds.length > 0
      ? rounds.reduce((s, r) => s + r.distanceKm, 0) / rounds.length
      : 0;
  const bestRound = rounds.reduce((m, r) => Math.max(m, r.points), 0);
  return {
    mode,
    total,
    maxTotal,
    rounds,
    avgDistanceKm,
    bestRound,
  };
}

// ---- Форматирование ----

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} м`;
  if (km < 100) return `${km.toFixed(1)} км`;
  return `${Math.round(km).toLocaleString("ru-RU")} км`;
}

export function formatScore(n: number): string {
  return n.toLocaleString("ru-RU");
}

// ---- Статистика (localStorage) ----

const STORAGE_KEY = "geoguessr-lite-stats-v1";
const EMPTY_STATS: GeoStats = {
  gamesPlayed: 0,
  bestScore: 0,
  totalScore: 0,
  roundsPlayed: 0,
  totalDistanceKm: 0,
  perfect: 0,
  nearPerfect: 0,
  lastPlayedAt: null,
};

export function loadGeoStats(): GeoStats {
  if (typeof window === "undefined") return EMPTY_STATS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATS;
    return { ...EMPTY_STATS, ...(JSON.parse(raw) as Partial<GeoStats>) };
  } catch {
    return EMPTY_STATS;
  }
}

export function saveGeoGameResult(result: GeoGameResult): GeoStats {
  const prev = loadGeoStats();
  const next: GeoStats = {
    gamesPlayed: prev.gamesPlayed + 1,
    bestScore: Math.max(prev.bestScore, result.total),
    totalScore: prev.totalScore + result.total,
    roundsPlayed: prev.roundsPlayed + result.rounds.length,
    totalDistanceKm: prev.totalDistanceKm + result.avgDistanceKm * result.rounds.length,
    perfect:
      prev.perfect +
      result.rounds.filter((r) => r.distanceKm <= 1).length,
    nearPerfect:
      prev.nearPerfect +
      result.rounds.filter((r) => r.distanceKm > 1 && r.distanceKm <= 10).length,
    lastPlayedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* приватный режим — игнорируем */
  }
  return next;
}
