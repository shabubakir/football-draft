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
  created_at timestamptz not null default now()
);

alter table public.quiz_rooms enable row level security;
create policy "quiz rooms readable" on public.quiz_rooms for select using (true);
create policy "anyone can create quiz rooms" on public.quiz_rooms for insert with check (true);
create policy "anyone can update quiz rooms" on public.quiz_rooms for update using (true);

alter publication supabase_realtime add table public.quiz_rooms;
