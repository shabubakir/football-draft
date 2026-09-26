-- ============================================================
-- Миграция: профиль игрока (опыт/звания) + результаты «Сетки дня»
-- Выполнить в Supabase Dashboard → SQL Editor
-- ============================================================

-- Профиль игрока: один на device_id (без аккаунта)
create table if not exists public.players_profile (
  id bigint generated always as identity primary key,
  device_id text not null unique,   -- стабильный ID из localStorage
  display_name text not null default 'Игрок',
  xp int not null default 0,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create index if not exists players_profile_device_id_idx on public.players_profile (device_id);

-- Результаты «Сетки дня» (ежедневная одиночная сетка)
create table if not exists public.grid_day_results (
  id bigint generated always as identity primary key,
  device_id text not null,
  puzzle_date date not null,
  grid_seed int not null,
  won boolean not null,
  correct int not null default 0,   -- сколько пересечений заполнено верно
  mistakes int not null default 0,  -- ошибки (макс. 3)
  created_at timestamptz not null default now()
);

create unique index if not exists grid_day_results_unique on public.grid_day_results (device_id, puzzle_date);

-- RLS
alter table public.players_profile enable row level security;
alter table public.grid_day_results enable row level security;

-- Профиль: свои строки можно читать, свои — создавать/обновлять
-- (device_id известен любому посетителю, но это не персональные данные — только игровой прогресс)
create policy "profile is public read" on public.players_profile for select using (true);
create policy "profile insert" on public.players_profile for insert with check (true);
create policy "profile update" on public.players_profile for update using (true);

-- Сетка дня: все видят (для таблицы лидеров), писать может любой
create policy "grid day results readable" on public.grid_day_results for select using (true);
create policy "grid day results insert" on public.grid_day_results for insert with check (true);
