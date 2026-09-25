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
5. Впишите ключи в `.env.local`

## Деплой на Vercel
1. Запушьте репозиторий в GitHub
2. [vercel.com](https://vercel.com) → Import → выберите репозиторий
3. В Settings → Environment Variables добавьте:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy — готово, скидывайте URL друзьям 🎉

## Как играть онлайн
1. Друзья открывают `/grid/online`
2. Один нажимает **«СОЗДАТЬ КОМНАТУ»**, получает код из 5 символов
3. Второй вводит код в **«ПОДКЛЮЧИТЬСЯ»**
4. Хост жмёт **«НАЧАТЬ ИГРУ»** — матчи идут в реальном времени
