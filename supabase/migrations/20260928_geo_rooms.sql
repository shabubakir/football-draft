-- ============================================================
-- GEOGUESSR LITE — MULTIPLAYER (комнаты 2–8 игроков)
-- Архитектура зеркалит cs2_battle_rooms:
--   - авторитетный backend: Next.js API route
--   - Supabase Realtime: postgres_changes на таблицу
--   - сервер выбирает локации раундов, считает расстояние/очки
-- Выполнить в Supabase Dashboard → SQL Editor (один раз)
-- ============================================================

create table if not exists public.geo_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'waiting', -- waiting | playing | finished
  rounds int not null default 5,          -- 5 | 10 (архитектура под расширение)
  players jsonb not null default '[]'::jsonb, -- [{id, name}]
  -- id локаций по раундам (выбирает СЕРВЕР, одинаковые для всех):
  -- ['loc_abc', null, null, ...]
  round_location_ids jsonb not null default '[]'::jsonb,
  -- раунды: {location_id, guesses: [{playerId, lat, lng, distanceKm, points}]}
  rounds_data jsonb not null default '[]'::jsonb,
  scores jsonb not null default '[]'::jsonb, -- [{playerId, total}]
  winner_id text,                            -- null = ничья
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists geo_rooms_code_idx on public.geo_rooms (code);
create index if not exists geo_rooms_created_idx on public.geo_rooms (created_at desc);

-- ---------- RLS (игра без аккаунта) ----------
alter table public.geo_rooms enable row level security;

drop policy if exists "geo rooms readable" on public.geo_rooms;
create policy "geo rooms readable" on public.geo_rooms for select using (true);

drop policy if exists "anyone can create geo rooms" on public.geo_rooms;
create policy "anyone can create geo rooms" on public.geo_rooms for insert with check (true);

drop policy if exists "anyone can update geo rooms" on public.geo_rooms;
create policy "anyone can update geo rooms" on public.geo_rooms for update using (true);

-- ---------- Realtime ----------
-- Если таблица уже добавлена в publication — строка даст "already exists",
-- это нормально, можно пропустить.
alter publication supabase_realtime add table public.geo_rooms;
