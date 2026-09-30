// ============================================================
// СВОЯ ИГРА — persistence (Supabase)
// ============================================================
// Таблица svoya_rooms: state jsonb (полная комната) + next_at.
// Read-then-write паттерн (как quiz-online) для защиты от гонок.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "../supabase";
import { applyAction, autoAdvance, normalizeRoom } from "./engine";
import type { SvoyaRoom, SvoyaAction } from "./engine";

// ---------- helpers ----------

/** Генерация кода комнаты (5 символов, без похожих). */
export function makeCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/**
 * Сохранить комнату.
 * - Если room.id пустая → INSERT (Postgres сам сгенерит UUID через default gen_random_uuid()).
 *   Затем UPDATE, чтобы state.id внутри jsonb тоже стал UUID.
 * - Если room.id задан → UPDATE по id (комната уже существует).
 *
 * ВАЖНО: не используем upsert — он роняет unique constraint на code,
 * даже когда id совпадает (PostgREST строит ON CONFLICT без явного
 * указания columns). Явный UPDATE безопасен.
 */
export async function saveRoom(
  sb: SupabaseClient,
  room: SvoyaRoom
): Promise<{ ok: boolean; error?: string; room?: SvoyaRoom }> {
  const payload = {
    code: room.code,
    state: room,
    next_at: room.nextAt,
  };
  if (!room.id) {
    // INSERT: пусть БД сгенерит UUID в колонку id
    const { data, error } = await sb
      .from("svoya_rooms")
      .insert(payload)
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "insert failed" };
    const realId = data.id as string;
    // state.id внутри jsonb всё ещё "" → перезаписываем UPDATE с корректным id
    room.id = realId;
    const { error: upErr } = await sb
      .from("svoya_rooms")
      .update({ state: room, next_at: room.nextAt })
      .eq("id", realId);
    if (upErr) return { ok: false, error: upErr.message };
    return { ok: true, room };
  }
  // UPDATE: комната уже существует
  const { error } = await sb
    .from("svoya_rooms")
    .update(payload)
    .eq("id", room.id);
  return { ok: !error, error: error?.message, room };
}

/** Прочитать комнату по id. */
export async function loadRoom(
  sb: SupabaseClient,
  id: string
): Promise<SvoyaRoom | null> {
  const { data, error } = await sb
    .from("svoya_rooms")
    .select("state")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return normalizeRoom((data as { state: SvoyaRoom }).state);
}

/** Прочитать комнату по коду. */
export async function loadRoomByCode(
  sb: SupabaseClient,
  code: string
): Promise<SvoyaRoom | null> {
  const { data, error } = await sb
    .from("svoya_rooms")
    .select("state")
    .eq("code", code.toUpperCase().trim())
    .maybeSingle();
  if (error || !data) return null;
  return normalizeRoom((data as { state: SvoyaRoom }).state);
}

/**
 * Read-then-write: применяет action через движок и сохраняет.
 * Возвращает { room, ok, error } — комната уже мутирована движком.
 *
 * ВАЖНО: перед применением читаем СВЕЖЕЕ состояние из БД,
 * чтобы не затереть чужие мутации (гонка).
 */
export async function applyAndSave(
  sb: SupabaseClient,
  roomId: string,
  action: SvoyaAction
): Promise<{ room: SvoyaRoom | null; ok: boolean; error?: string }> {
  // 1. Читаем свежее
  const fresh = await loadRoom(sb, roomId);
  if (!fresh) return { room: null, ok: false, error: "Комната не найдена" };

  // 2. Применяем через движок
  const res = applyAction(fresh, action);

  // 3. Сохраняем результат (ok или нет — состояние могло измениться)
  const saved = await saveRoom(sb, res.room);
  if (!saved.ok) return { room: res.room, ok: false, error: saved.error ?? "Ошибка записи" };

  return { room: res.room, ok: res.ok, error: res.error };
}

/**
 * Авто-продвижение (для polling): если nextAt просрочен — продвигаем и сохраняем.
 * Идемпотентно (движок проверяет nextAt).
 */
export async function autoAdvanceAndSave(
  sb: SupabaseClient,
  roomId: string
): Promise<{ room: SvoyaRoom | null; advanced: boolean }> {
  const fresh = await loadRoom(sb, roomId);
  if (!fresh) return { room: null, advanced: false };

  const res = autoAdvance(fresh, new Date());
  if (!res.advanced) return { room: fresh, advanced: false };

  const saved = await saveRoom(sb, res.room);
  if (!saved.ok) return { room: res.room, advanced: false };
  return { room: res.room, advanced: true };
}

/** Получить supabase-клиент (browser). */
export function getSb(): SupabaseClient | null {
  return getSupabaseBrowser();
}
