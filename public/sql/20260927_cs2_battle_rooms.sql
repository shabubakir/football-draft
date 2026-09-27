-- ============================================================
-- CASE BATTLE — комнаты 1v1 для CS2
-- Выполнить в Supabase Dashboard → SQL Editor (один раз)
-- ============================================================

create table if not exists public.cs2_battle_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  mode text not null default 'classic',  -- 'classic' | 'speed' | 'high_roller' | ... (для будущих режимов)
  status text not null default 'waiting', -- waiting | playing | finished
  -- настройки матча (одинаковые для обоих)
  case_name text not null,
  bank int not null default 10000,
  rounds int not null default 10,
  -- общий seed: сервер авторитетен, клиент его не знает
  match_seed bigint not null,
  players jsonb not null default '[]'::jsonb,  -- [{id, name, seat: 'host'|'guest'}]
  -- раунды: массив из `rounds` элементов
  -- каждый: {p1: {item, img, tier, isSt, float, wear, price, revealed}, p2: {...}}
  -- null = ещё не открыт; revealed=false = открыт, но результат скрыт до анимации
  rounds_data jsonb not null default '[]'::jsonb,
  winner text,                               -- 'host' | 'guest' | 'draw' | null
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists cs2_battle_rooms_code_idx on public.cs2_battle_rooms (code);
create index if not exists cs2_battle_rooms_created_idx on public.cs2_battle_rooms (created_at desc);

-- ---------- RLS (как у grid_rooms — игра без аккаунта) ----------
alter table public.cs2_battle_rooms enable row level security;

drop policy if exists "battle rooms readable" on public.cs2_battle_rooms;
create policy "battle rooms readable" on public.cs2_battle_rooms
  for select using (true);

drop policy if exists "battle rooms writable" on public.cs2_battle_rooms;
create policy "battle rooms writable" on public.cs2_battle_rooms
  for insert with check (true);

drop policy if exists "battle rooms updatable" on public.cs2_battle_rooms;
create policy "battle rooms updatable" on public.cs2_battle_rooms
  for update using (true);

-- ---------- Подписка realtime ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_objects where pubname = 'supabase_realtime' and objname = 'cs2_battle_rooms'
  ) then
    alter publication supabase_realtime add table public.cs2_battle_rooms;
  end if;
end $$;
