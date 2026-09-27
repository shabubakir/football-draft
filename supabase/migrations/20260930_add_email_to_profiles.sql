-- Добавляем поле email в таблицу user_profiles
alter table public.user_profiles add column if not exists email text;
