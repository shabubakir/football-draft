-- Миграция: таблица результатов игры "Путь футболиста"
-- Запустить в Supabase SQL Editor

create table if not exists public.career_results (
  id bigint generated always as identity primary key,
  device_id text not null,
  puzzle_date date not null,
  points integer not null default 0,
  won boolean not null default false,
  created_at timestamptz not null default now(),
  unique (device_id, puzzle_date)
);

-- Индекс для быстрого поиска по дате и устройству
create index if not exists idx_career_results_date on public.career_results (puzzle_date);
create index if not exists idx_career_results_device on public.career_results (device_id);

-- Разрешения для anon key
alter table public.career_results enable row level security;

create policy "allow_anon_select" on public.career_results for select using (true);
create policy "allow_anon_insert" on public.career_results for insert with check (true);
create policy "allow_anon_update" on public.career_results for update using (true);
