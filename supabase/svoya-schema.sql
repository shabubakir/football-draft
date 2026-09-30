-- ============================================================
-- СВОЯ ИГРА — таблица комнат + RLS + realtime
-- ============================================================
-- Все данные комнаты хранятся в jsonb-колонках (как quiz_rooms).
-- Dвижок (src/lib/svoya/engine.ts) — single source of truth для
-- логики; сюда пишется ЦЕЛИКОМ сериализованная комната.

create table if not exists public.svoya_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  state jsonb not null,          -- полная сериализованная SvoyaRoom
  next_at timestamptz,           -- серверный таймер (дублируется из state)
  created_at timestamptz not null default now()
);

alter table public.svoya_rooms enable row level security;

drop policy if exists "svoya rooms readable" on public.svoya_rooms;
drop policy if exists "anyone can create svoya rooms" on public.svoya_rooms;
drop policy if exists "anyone can update svoya rooms" on public.svoya_rooms;

create policy "svoya rooms readable" on public.svoya_rooms for select using (true);
create policy "anyone can create svoya rooms" on public.svoya_rooms for insert with check (true);
create policy "anyone can update svoya rooms" on public.svoya_rooms for update using (true);

-- Realtime: уведомления о любых изменениях комнаты
do $$
begin
  alter publication supabase_realtime add table public.svoya_rooms;
exception
  when duplicate_object then null;
end
$$;

-- Индекс по коду (для поиска комнаты по invite-ссылке)
create index if not exists svoya_rooms_code_idx on public.svoya_rooms (code);
-- Индекс по next_at (для потенциальной serverless-функции-тикера)
create index if not exists svoya_rooms_next_at_idx on public.svoya_rooms (next_at);
