-- ============================================================
-- PROGRESSION SYSTEM MIGRATION
-- Adds: user_streaks, user_missions, game_results,
--       user_titles, user_badges, user_notifications, friends
-- Extends: user_game_stats (already exists), xp_events (already exists)
-- ============================================================

-- 1. Daily streak tracking
create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  best_streak int not null default 0,
  last_played_date date,
  updated_at timestamptz not null default now()
);

alter table public.user_streaks enable row level security;

create policy "User can read own streak"
  on public.user_streaks for select
  using (auth.uid() = user_id);

create policy "User can update own streak"
  on public.user_streaks for update
  using (auth.uid() = user_id);

create policy "User can insert own streak"
  on public.user_streaks for insert
  with check (auth.uid() = user_id);

-- 2. Mission progress tracking
create table if not exists public.user_missions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id text not null,
  type text not null check (type in ('daily', 'weekly')),
  period text not null,
  period_key text not null,
  progress int not null default 0,
  reward_xp int not null default 0,
  claimed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, mission_id, period, period_key)
);

create index if not exists idx_missions_user_period
  on public.user_missions(user_id, period, period_key);

alter table public.user_missions enable row level security;

create policy "User can read own missions"
  on public.user_missions for select
  using (auth.uid() = user_id);

create policy "User can insert own missions"
  on public.user_missions for insert
  with check (auth.uid() = user_id);

create policy "User can update own missions"
  on public.user_missions for update
  using (auth.uid() = user_id);

-- 3. Game results history (for recent activity feed)
create table if not exists public.game_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  won boolean not null default false,
  score int,
  xp_earned int not null default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_game_results_user_date
  on public.game_results(user_id, created_at desc);

alter table public.game_results enable row level security;

create policy "User can read own results"
  on public.game_results for select
  using (auth.uid() = user_id);

create policy "Service role can insert results"
  on public.game_results for insert
  with check (true);

-- 4. User titles (selectable rank titles)
create table if not exists public.user_titles (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title_id text not null,
  unlocked_at timestamptz not null default now(),
  is_active boolean not null default false,
  unique (user_id, title_id)
);

alter table public.user_titles enable row level security;

create policy "User can read own titles"
  on public.user_titles for select
  using (auth.uid() = user_id);

create policy "User can manage own titles"
  on public.user_titles for insert
  with check (auth.uid() = user_id);

create policy "User can update own titles"
  on public.user_titles for update
  using (auth.uid() = user_id);

-- 5. User badges (selectable display badges)
create table if not exists public.user_badges (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null,
  unlocked_at timestamptz not null default now(),
  is_displayed boolean not null default false,
  unique (user_id, badge_id)
);

alter table public.user_badges enable row level security;

create policy "User can read own badges"
  on public.user_badges for select
  using (auth.uid() = user_id);

create policy "User can manage own badges"
  on public.user_badges for insert
  with check (auth.uid() = user_id);

create policy "User can update own badges"
  on public.user_badges for update
  using (auth.uid() = user_id);

-- 6. In-app notifications
create table if not exists public.user_notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user
  on public.user_notifications(user_id, created_at desc);

alter table public.user_notifications enable row level security;

create policy "User can read own notifications"
  on public.user_notifications for select
  using (auth.uid() = user_id);

create policy "Service role can insert notifications"
  on public.user_notifications for insert
  with check (true);

create policy "User can update own notifications"
  on public.user_notifications for update
  using (auth.uid() = user_id);

-- 7. Friends system (basic)
create table if not exists public.friends (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  unique (user_id, friend_id)
);

create index if not exists idx_friends_user
  on public.friends(user_id);

create index if not exists idx_friends_friend
  on public.friends(friend_id);

alter table public.friends enable row level security;

create policy "User can read own friendships"
  on public.friends for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "User can send friend request"
  on public.friends for insert
  with check (auth.uid() = user_id);

create policy "User can update friendship status"
  on public.friends for update
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "User can delete own friendship"
  on public.friends for delete
  using (auth.uid() = user_id);

-- 8. Profile customization fields (extend user_profiles)
alter table public.user_profiles add column if not exists selected_title text default null;
alter table public.user_profiles add column if not exists avatar_frame text default null;
alter table public.user_profiles add column if not exists profile_bg text default null;

-- 9. Ensure user_game_stats has proper RLS
-- (table may already exist from earlier migration)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_game_stats'
      and policyname = 'User can read own game stats'
  ) then
    create policy "User can read own game stats"
      on public.user_game_stats for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_game_stats'
      and policyname = 'User can update own game stats'
  ) then
    create policy "User can update own game stats"
      on public.user_game_stats for update
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_game_stats'
      and policyname = 'User can insert own game stats'
  ) then
    create policy "User can insert own game stats"
      on public.user_game_stats for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

-- NOTE: leaderboard_view is a VIEW — RLS policies cannot be created on views.
-- Access to the underlying tables (user_profiles, xp_events, user_game_stats)
-- already controls what is readable.
