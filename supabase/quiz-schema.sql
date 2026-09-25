-- ---------- Викторина до 5 игроков ----------
create table if not exists public.quiz_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'lobby',  -- lobby | playing | finished
  current_q int not null default 0,
  q_state text not null default 'answering',  -- answering | reveal
  host_name text not null default 'Хост',
  players jsonb not null default '[]'::jsonb,  -- [{id, name, isHost, joinedAt}]
  scores jsonb not null default '{}'::jsonb,   -- { playerId: points }
  answers jsonb not null default '{}'::jsonb,  -- { qIndex: { playerId: optionIndex } }
  seed int,  -- порядок вопросов (общий для всех)
  topic text not null default 'football',  -- football | geo
  rematch_votes jsonb,  -- { playerId: true/false } — голос за реванш
  next_at timestamptz,  -- серверный таймер: когда продвинуть
  created_at timestamptz not null default now()
);

alter table public.quiz_rooms enable row level security;
alter table public.quiz_rooms add column if not exists topic text not null default 'football';

drop policy if exists "quiz rooms readable" on public.quiz_rooms;
drop policy if exists "anyone can create quiz rooms" on public.quiz_rooms;
drop policy if exists "anyone can update quiz rooms" on public.quiz_rooms;

create policy "quiz rooms readable" on public.quiz_rooms for select using (true);
create policy "anyone can create quiz rooms" on public.quiz_rooms for insert with check (true);
create policy "anyone can update quiz rooms" on public.quiz_rooms for update using (true);

do $$
begin
  alter publication supabase_realtime add table public.quiz_rooms;
exception
  when duplicate_object then null;
end
$$;
