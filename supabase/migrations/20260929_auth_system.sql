-- ============================================================
-- AUTH SYSTEM MIGRATION
-- Добавляет систему авторизации поверх существующего Supabase
-- ============================================================

-- 1. Пользовательский профиль (привязан к Supabase Auth user)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  avatar_url text default null,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  -- Связь с гостевым профилем (для миграции)
  migrated_from_device_id text default null
);

-- Индекс для быстрого поиска по username
create index if not exists idx_user_profiles_username on public.user_profiles(username);

-- 2. Game stats (расширяемая архитектура)
-- Каждая игра хранит свою статистику в jsonb
create table if not exists public.user_game_stats (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  game_id text not null, -- 'cs2-aim', 'cs2-hl', 'geoguessr', 'akinator', 'football-draft', etc.
  stats jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create index if not exists idx_user_game_stats_user on public.user_game_stats(user_id);

-- 3. Achievements
create table if not exists public.achievements (
  id text primary key, -- 'first_game', 'on_fire', 'aim_master', etc.
  title text not null,
  description text not null,
  icon text not null default '🏆',
  -- Условие (для клиентской проверки, сервер валидирует)
  condition jsonb not null default '{}'
);

-- 4. User achievements
create table if not exists public.user_achievements (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- 5. XP ledger (audit trail)
create table if not exists public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  amount int not null,
  reason text not null, -- 'game_win', 'game_complete', 'perfect_game', 'daily_challenge', etc.
  game_id text default null,
  created_at timestamptz not null default now()
);

create index if not exists idx_xp_events_user on public.xp_events(user_id);

-- 6. Seed achievements
insert into public.achievements (id, title, description, icon, condition) values
  ('first_game', 'Первая игра', 'Сыграй свою первую игру', '🎮', '{"type": "games_played", "value": 1}'),
  ('on_fire', 'В огне', 'Выиграй 5 игр подряд', '🔥', '{"type": "win_streak", "value": 5}'),
  ('aim_master', 'Мастер прицела', 'Получи 800+ очков в CS2 Aim', '🎯', '{"type": "game_score", "game": "cs2-aim", "value": 800}'),
  ('skin_expert', 'Эксперт по скинам', 'Streak 10 в Higher/Lower', '💰', '{"type": "game_streak", "game": "cs2-hl", "value": 10}'),
  ('explorer', 'Исследователь', 'Сыграй 10 игр GeoGuessr', '🌍', '{"type": "games_played", "game": "geoguessr", "value": 10}'),
  ('football_fan', 'Футбольный фанат', 'Сыграй 10 футбольных игр', '⚽', '{"type": "games_played", "game": "football", "value": 10}')
on conflict (id) do nothing;

-- 7. RLS policies
-- Пользователи могут видеть только свои данные
alter table public.user_profiles enable row level security;
alter table public.user_game_stats enable row level security;
alter table public.user_achievements enable row level security;
alter table public.xp_events enable row level security;
alter table public.achievements enable row level security;

-- achievements: публичное чтение (определения достижений)
create policy "Achievements are public" on public.achievements
  for select using (true);

-- user_profiles: пользователь видит свой профиль
create policy "Users can view own profile" on public.user_profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.user_profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.user_profiles
  for insert with check (auth.uid() = id);

-- user_game_stats: пользователь видит только свою статистику
create policy "Users can view own stats" on public.user_game_stats
  for select using (auth.uid() = user_id);
create policy "Users can update own stats" on public.user_game_stats
  for update using (auth.uid() = user_id);
create policy "Users can insert own stats" on public.user_game_stats
  for insert with check (auth.uid() = user_id);

-- user_achievements: пользователь видит только свои достижения
create policy "Users can view own achievements" on public.user_achievements
  for select using (auth.uid() = user_id);
create policy "Users can insert own achievements" on public.user_achievements
  for insert with check (auth.uid() = user_id);

-- xp_events: пользователь видит только свои события
create policy "Users can view own xp events" on public.xp_events
  for select using (auth.uid() = user_id);
-- INSERT только через service role (API routes)

-- 8. Public read for leaderboard (только публичные данные)
-- Создаём view для лидерборда
create or replace view public.leaderboard_view as
select
  up.id as user_id,
  up.username,
  up.avatar_url,
  up.created_at,
  -- XP из sum xp_events
  coalesce(sum(xe.amount), 0) as total_xp,
  -- Games played из user_game_stats
  count(distinct ugs.game_id) as games_played
from public.user_profiles up
left join public.xp_events xe on up.id = xe.user_id
left join public.user_game_stats ugs on up.id = ugs.user_id
where up.created_at is not null
group by up.id, up.username, up.avatar_url, up.created_at;

-- View наследует RLS от базовых таблиц (user_profiles, xp_events, user_game_stats)
-- Публичное чтение обеспечивается тем, что все поля в view — публичные данные
