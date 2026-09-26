-- ============================================================
-- Football Draft — схема БД для Supabase
-- Вставьте этот SQL в Supabase Dashboard → SQL Editor
-- ============================================================

-- ---------- Игроки (база для «Угадай игрока») ----------
create table if not exists public.players (
  id bigint generated always as identity primary key,
  name_ru text not null,
  name_en text,
  country text not null,          -- «Россия», «Бразилия»…
  position text not null,         -- ВР / Защитник / Полузащитник / Нападающий
  birth_year int not null,
  current_club text not null,
  debut_club text not null,
  max_market_value int not null,  -- млн €
  active boolean not null default true
);

create index if not exists players_name_ru_idx on public.players (name_ru);

-- ---------- Ежедневные загадки (раскрываются по дате) ----------
create table if not exists public.daily_puzzles (
  id bigint generated always as identity primary key,
  puzzle_date date not null unique,
  player_id bigint not null references public.players(id),
  solved_by jsonb not null default '{}'::jsonb  -- { player_id: { count, avg_attempts } }
);

-- ---------- Результаты игроков («Угадай игрока») ----------
create table if not exists public.guess_results (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  puzzle_id bigint not null references public.daily_puzzles(id),
  won boolean not null,
  attempts int not null,          -- количество попыток (<=10)
  created_at timestamptz not null default now()
);

-- ---------- Комнаты «Сетка 9 онлайн» ----------
create table if not exists public.grid_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_user_id uuid references auth.users(id),
  status text not null default 'waiting',  -- waiting | playing | finished
  players jsonb not null default '[]'::jsonb,  -- [{id, name, seat: 'host'|'guest'}]
  seed int not null,
  clue_type text not null,          -- «club» | «national» | «award»
  clues jsonb not null,             -- 9 подсказок
  host_board jsonb,
  guest_board jsonb,
  winner text,                       -- 'host' | 'guest' | 'draw'
  created_at timestamptz not null default now()
);

-- ---------- Результаты матчей «Сетка 9» ----------
create table if not exists public.grid_results (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.grid_rooms(id),
  user_id uuid not null,
  won boolean,
  score text,                        -- «3:1», «2:2 (ничья)»
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
alter table public.players enable row level security;
alter table public.daily_puzzles enable row level security;
alter table public.guess_results enable row level security;
alter table public.grid_rooms enable row level security;
alter table public.grid_results enable row level security;

-- Все игроки и загадки видят все (без ответа!)
create policy "players are public" on public.players for select using (true);
create policy "daily puzzles are public" on public.daily_puzzles for select using (true);

-- Результаты: свои — всегда, чужие — только сводка
create policy "users read own guess results" on public.guess_results for select using (auth.uid() = user_id);
create policy "users insert own guess results" on public.guess_results for insert with check (auth.uid() = user_id);

-- Комнаты: видит владелец или подключившийся гость (через realtime)
create policy "rooms readable" on public.grid_rooms for select using (true);
create policy "anyone can create rooms" on public.grid_rooms for insert with check (true);
create policy "anyone can update rooms" on public.grid_rooms for update using (true);

-- Результаты сетки: свои — всегда
create policy "users read own grid results" on public.grid_results for select using (auth.uid() = user_id);
create policy "users insert own grid results" on public.grid_results for insert with check (auth.uid() = user_id);

-- ---------- Realtime ----------
do $$
begin
  alter publication supabase_realtime add table public.grid_rooms;
exception
  when duplicate_object then null;
end
$$;

-- ---------- Обновление существующих БД ----------
-- (для тех, кто уже выполнял этот скрипт до появления колонки players)
alter table public.grid_rooms add column if not exists players jsonb not null default '[]'::jsonb;
