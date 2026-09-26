# Football Draft ⚽

Футбольные игры для игры с друзьями. Вдохновлено championsdraft.ru.

## Игры
- **Угадай игрока** (`/guess`) — ежедневная загадка, 10 попыток
- **Сетка 9 онлайн** (`/grid/online`) — PvP-матч в реальном времени с друзьями через Supabase Realtime
- *Скоро:* Драфт, Путь футболиста

## Стек
- Next.js 16 (App Router, TypeScript, Tailwind CSS)
- Supabase (Realtime + Postgres) — для онлайн-матчей
- Vercel — деплой

## Запуск локально
```bash
npm install
cp .env.local.example .env.local
# заполните NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Онлайн-режим не работает без Supabase — «Угадай игрока» играется и без него.

## Supabase настройка
1. Зарегистрируйтесь на [supabase.com](https://supabase.com) и создайте проект
2. Откройте **Project Settings → API**, скопируйте `Project URL` и `anon public key`
3. В **SQL Editor** выполните скрипт из [`supabase/schema.sql`](./supabase/schema.sql)
4. Для онлайн-викторины дополнительно выполните [`supabase/quiz-schema.sql`](./supabase/quiz-schema.sql) — в нём, в частности, хранится выбранная тема комнаты (`football` или `geo`)
5. Если БД создавалась ранее (до 26.09.2026) — выполните миграцию [`supabase/migrations/20260926_add_players_to_grid_rooms.sql`](./supabase/migrations/20260926_add_players_to_grid_rooms.sql) (добавляет колонку `players` в `grid_rooms` для индикатора игроков и подключения по имени)
6. Впишите ключи в `.env.local`

## Деплой на Vercel
1. Запушьте репозиторий в GitHub
2. [vercel.com](https://vercel.com) → Import → выберите репозиторий
3. В Settings → Environment Variables добавьте:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy — готово, скидывайте URL друзьям 🎉

## Как играть онлайн
1. Один нажимает **«СОЗДАТЬ КОМНАТУ»** (в сетке 9 или викторине), получает код и ссылку `/j/ABCDE`
2. Второй открывает ссылку (или вводит код в **«ПОДКЛЮЧИТЬСЯ»** на странице игры), вводит имя
3. Хост жмёт **«НАЧАТЬ ИГРУ»** — матчи идут в реальном времени

Ссылки `/j/ABCDE` универсальны: приложение само определяет, сетка 9 это или викторина, и открывает нужную игру.
