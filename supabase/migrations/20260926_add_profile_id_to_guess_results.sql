-- ============================================================
-- Миграция: profile_id в guess_results (связь результатов с профилем)
-- Выполнить в Supabase Dashboard → SQL Editor
-- ============================================================

alter table public.guess_results
  add column if not exists profile_id text;

create index if not exists guess_results_profile_idx on public.guess_results (profile_id, created_at);

-- RLS на чтение по profile_id (сводка активности для рейтинга)
drop policy if exists "users read own guess results" on public.guess_results;
create policy "users read own guess results" on public.guess_results
  for select using (auth.uid() = user_id or profile_id is not null);
