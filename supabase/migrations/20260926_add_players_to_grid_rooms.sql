-- Обновление для существующих БД: колонка players в grid_rooms
-- Выполнить один раз в Supabase Dashboard → SQL Editor
-- (если БД создавалась по новому schema.sql — пропускать, колонка уже есть)
alter table public.grid_rooms add column if not exists players jsonb not null default '[]'::jsonb;
