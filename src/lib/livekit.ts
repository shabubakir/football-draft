// ============================================================
// LiveKit — серверная валидация (route handler, НЕ клиент)
// ============================================================
// Секретные ключи (LIVEKIT_API_KEY / LIVEKIT_API_SECRET) никогда
// не попадают в клиентский бандл. Этот модуль импортируется
// только из src/app/api/livekit-token/route.ts.

import { getSupabaseServer } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Проверка, что LiveKit настроен (все 3 переменные). */
export function isLiveKitConfigured(): boolean {
  return Boolean(
    process.env.LIVEKIT_URL &&
    process.env.LIVEKIT_API_KEY &&
    process.env.LIVEKIT_API_SECRET
  );
}

export type LiveKitVerifyResult =
  | { ok: true; name: string }
  | { ok: false; error: string; status: number };

/**
 * Валидация запроса на выдачу токена:
 *  1. roomId и playerId непустые
 *  2. Комната существует
 *  3. Игрок является участником комнаты
 *
 * Возвращает имя игрока (для отображения в голосовом чате)
 * или ошибку с HTTP-статусом.
 */
export async function verifyRoomMembership(
  roomId: string,
  playerId: string
): Promise<LiveKitVerifyResult> {
  if (!roomId || !playerId) {
    return { ok: false, error: "roomId и playerId обязательны", status: 400 };
  }

  const sb: SupabaseClient | null = getSupabaseServer();
  if (!sb) {
    return { ok: false, error: "Supabase не настроен", status: 503 };
  }

  const { data, error } = await sb
    .from("svoya_rooms")
    .select("state")
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    // Не логируем детали запроса, только код ошибки
    return { ok: false, error: "Ошибка загрузки комнаты", status: 500 };
  }
  if (!data) {
    return { ok: false, error: "Комната не найдена", status: 404 };
  }

  const room = (data as { state: { players?: { id: string; name: string }[] } })
    .state;
  const players = room?.players ?? [];
  const player = players.find((p) => p.id === playerId);
  if (!player) {
    return { ok: false, error: "Вы не участник этой комнаты", status: 403 };
  }

  return { ok: true, name: player.name };
}
