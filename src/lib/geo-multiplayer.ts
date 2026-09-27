// ============================================================
// GEOGUESSR LITE — MULTIPLAYER: общая логика
// Используется сервером (API route) и клиентом.
// Архитектура зеркалит cs2-battle: сервер авторитетен
// (выбирает локации, считает расстояние/очки), клиент
// отправляет только координаты своей точки.
// ============================================================

import {
  haversineKm,
  pointsForDistance,
  type GeoLocation,
} from "@/games/geoguessr/geo-engine";
import { LOCATIONS } from "@/games/geoguessr/locations";

// ---------- Ограничения (архитектура под расширение) ----------

/** Максимум игроков в комнате (MVP). Можно поднять позже. */
export const GEO_MAX_PLAYERS = 8;
/** Доступные варианты раундов (MVP). Можно расширить. */
export const GEO_ROUND_OPTIONS = [5, 10] as const;
export type GeoRoundCount = (typeof GEO_ROUND_OPTIONS)[number];

export function isGeoRoundCount(n: unknown): n is GeoRoundCount {
  return GEO_ROUND_OPTIONS.some((r) => r === n);
}

// ---------- Игрок ----------

export interface GeoPlayer {
  id: string;
  name: string;
  /** true, пока соединение живое (heartbeat) */
  online: boolean;
  joined_at: string;
}

// ---------- Гаданье в раунде ----------

export interface GeoGuessEntry {
  playerId: string;
  lat: number;
  lng: number;
  /** вычисляет СЕРВЕР */
  distanceKm: number;
  /** вычисляет СЕРВЕР */
  points: number;
}

// ---------- Раунд ----------

export interface GeoRoomRound {
  location_id: string | null;
  guesses: GeoGuessEntry[];
}

// ---------- Комната ----------

export interface GeoRoom {
  id: string;
  code: string;
  status: "waiting" | "playing" | "finished";
  rounds: number;
  players: GeoPlayer[];
  /** id локаций по раундам (одинаковые для всех) */
  round_location_ids: (string | null)[];
  /** раунды; current_round = rounds_data.length - 1 (playing) */
  rounds_data: GeoRoomRound[];
  /** [{playerId, total}] */
  scores: { playerId: string; total: number }[];
  winner_id: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

// ---------- Локации по id ----------

const locationIndex: Map<string, GeoLocation> = new Map(
  LOCATIONS.map((l) => [l.id, l])
);

export function getLocationById(id: string): GeoLocation | null {
  return locationIndex.get(id) ?? null;
}

/** СЕРВЕР: выбирает N уникальных id локаций для партии. */
export function pickRoundLocationIds(count: number): string[] {
  const pool = [...LOCATIONS];
  const ids: string[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const j = Math.floor(Math.random() * pool.length);
    ids.push(pool.splice(j, 1)[0].id);
  }
  return ids;
}

// ---------- Код комнаты ----------

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // без 0/O/1/I

export function makeGeoCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

// ---------- Авторитетный подсчёт раунда ----------
// Клиент присылает ТОЛЬКО координаты; расстояние и очки
// считает сервер. Повторный guess того же игрока заменяет
// предыдущий (до раскрытия).

export function scoreRoundGuess(
  location: GeoLocation,
  playerId: string,
  lat: number,
  lng: number
): GeoGuessEntry {
  const distanceKm = haversineKm(lat, lng, location.latitude, location.longitude);
  return {
    playerId,
    lat,
    lng,
    distanceKm,
    points: pointsForDistance(distanceKm),
  };
}

// ---------- Сводка по игроку (для финала) ----------

export interface GeoPlayerSummary {
  playerId: string;
  total: number;
  /** лучший раунд: очки */
  bestRound: number;
  /** самое близкое попадание, км */
  closestKm: number;
  /** среднее расстояние, км */
  avgKm: number;
}

export function summarizePlayer(
  playerId: string,
  rounds: number,
  roundsData: GeoRoomRound[]
): GeoPlayerSummary {
  let total = 0;
  let bestRound = 0;
  let closestKm = Infinity;
  let sumKm = 0;
  let hits = 0;
  for (let i = 0; i < rounds; i++) {
    const g = roundsData[i]?.guesses.find((x) => x.playerId === playerId);
    if (!g) continue;
    total += g.points;
    bestRound = Math.max(bestRound, g.points);
    closestKm = Math.min(closestKm, g.distanceKm);
    sumKm += g.distanceKm;
    hits++;
  }
  if (!Number.isFinite(closestKm)) closestKm = 0;
  return {
    playerId,
    total,
    bestRound,
    closestKm,
    avgKm: hits > 0 ? sumKm / hits : 0,
  };
}

/** Итоговые очки по каждому игроку (в порядке players). */
export function computeScores(
  players: GeoPlayer[],
  roundsData: GeoRoomRound[]
): { playerId: string; total: number }[] {
  return players.map((p) => {
    let total = 0;
    for (const r of roundsData) {
      const g = r.guesses.find((x) => x.playerId === p.id);
      if (g) total += g.points;
    }
    return { playerId: p.id, total };
  });
}

/** Победитель: null = ничья / нет очков. */
export function computeWinner(scores: { playerId: string; total: number }[]): string | null {
  if (scores.length === 0) return null;
  const max = Math.max(...scores.map((s) => s.total));
  const top = scores.filter((s) => s.total === max);
  if (top.length !== 1 || max <= 0) return null;
  return top[0].playerId;
}
