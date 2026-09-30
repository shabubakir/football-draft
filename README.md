# Football Draft ⚽

Футбольные игры для игры с друзьями. Вдохновлено championsdraft.ru.

## Игры
- **Угадай игрока** (`/guess`) — ежедневная загадка, 10 попыток + архив недели
- **Сетка дня** (`/grid/day`) — одна сетка 9×9 на всех, 3 ошибки, рейтинг дня/недели
- **Сетка 9 онлайн** (`/grid/online`) — PvP-матч в реальном времени с друзьями через Supabase Realtime
- **КВИЗЫ** (онлайн, 2–6 игроков, через Supabase Realtime):
  - **Онлайн-викторина** (`/quiz/online`) — 10 вопросов, футбольная/гео-тема
  - **Гео-викторина** (`/quiz/geo`) — города по фото, 8 раундов
  - **Своя игра** (`/svoya`) — Jeopardy 5×5: общие вопросы, таймер, ± очки, очередь ходов, таблица результатов
- **Рейтинг** (`/leaderboard`) — опыт, уровни, звания (НОВИЧОК → МИФИЧЕСКИЙ), топ-100
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

### Переменные окружения (`.env.local`)
| Переменная | Обязательна | Назначение |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | для онлайн-игр | URL проекта Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | для онлайн-игр | anon public key |
| `NEXT_PUBLIC_USE_WS_PROXY` | нет (по умолчанию `1`) | `1` = realtime идёт через локальный WS-мост (`ws://localhost:9443`) для корпоративного прокси; `0` = прямой wss до Supabase |

> **Realtime за корпоративным прокси (squid).** Прямые WebSocket-соединения
> могут блокироваться. Тогда поставьте локальный мост — см. заголовок
> [`src/lib/ws-proxy-transport.ts`](./src/lib/ws-proxy-transport.ts)
> (запускается `node ws-bridge.mjs`, слушает `localhost:9443` и пробивает
> CONNECT-туннель до Supabase). Если мост не запущен, игра всё равно работает
> через **polling каждые 1 c** — просто с задержкой до 1 с вместо realtime.

## Supabase настройка
1. Зарегистрируйтесь на [supabase.com](https://supabase.com) и создайте проект
2. Откройте **Project Settings → API**, скопируйте `Project URL` и `anon public key`
3. В **SQL Editor** выполните скрипт из [`supabase/schema.sql`](./supabase/schema.sql)
4. Для онлайн-викторин дополнительно выполните:
   - [`supabase/quiz-schema.sql`](./supabase/quiz-schema.sql) — тема комнаты (`football` или `geo`)
   - [`supabase/svoya-schema.sql`](./supabase/svoya-schema.sql) — таблица `svoya_rooms` (комнаты «Своей игры»: вся комната в jsonb-колонке `state`), RLS и realtime-publication
5. Если БД создавалась ранее (до 26.09.2026) — выполните миграции по порядку:
   - [`supabase/migrations/20260926_add_players_to_grid_rooms.sql`](./supabase/migrations/20260926_add_players_to_grid_rooms.sql) — колонка `players` в `grid_rooms`
   - [`supabase/migrations/20260926_add_players_profile_and_grid_results.sql`](./supabase/migrations/20260926_add_players_profile_and_grid_results.sql) — профиль игрока (опыт/звания) + результаты «Сетки дня»
   - [`supabase/migrations/20260926_add_profile_id_to_guess_results.sql`](./supabase/migrations/20260926_add_profile_id_to_guess_results.sql) — связь результатов угадывалки с профилем
6. Впишите ключи в `.env.local`

## Деплой на Vercel
1. Запушьте репозиторий в GitHub
2. [vercel.com](https://vercel.com) → Import → выберите репозиторий
3. В Settings → Environment Variables добавьте:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_USE_WS_PROXY=0` (на Vercel нет локального моста — realtime идёт прямым wss)
4. Deploy — готово, скидывайте URL друзьям 🎉

## Как играть онлайн
1. Один нажимает **«СОЗДАТЬ КОМНАТУ»** (в сетке 9 или викторине), получает код и ссылку `/j/ABCDE`
2. Второй открывает ссылку (или вводит код в **«ПОДКЛЮЧИТЬСЯ»** на странице игры), вводит имя
3. Хост жмёт **«НАЧАТЬ ИГРУ»** — матчи идут в реальном времени

Ссылки `/j/ABCDE` универсальны: приложение само определяет, сетка 9 это или викторина, и открывает нужную игру.

### Своя игра (`/svoya`)
- **2–6 игроков**, код комнаты 5 символов + ссылка-приглашение `/svoya/join/<КОД>`
- Доска **5×5** (5 категорий × номиналы 100–500), категории выбираются случайно из 8
- Игроки по очереди выбирают вопрос → отвечают текстом → **хост ставит вердикт** «верно/неверно» (как ведущий)
- **+номинал** за верный ответ, **−номинал** за неверный; **таймаут** ответа (20 с, настраивается 10/20/30/60) штрафует выбравшего
- **REVEAL**: ответ + пояснение на 10 с, затем следующий ход
- Конец доски — **таблица результатов**; при ничьей все лидеры получают 🏆
- Rejoin (обновить вкладку → «С возвращением»), передача хоста, защита от гонок/двойных действий — всё в движке `src/lib/svoya/engine.ts`

## Прогресс и рейтинг
- Прогресс сохраняется по `device_id` в localStorage — аккаунт не нужен
- Имя игрока задаётся на главной (бейдж с ✎) и в играх
- Опыт: «Угадай игрока» (100 XP за 1 попытку, 60 за победу), «Сетка дня» (80 XP за победу)
- Звания по уровням: 1 НОВИЧОК → 10 МИФИЧЕСКИЙ, уровень = 1 + ⌊XP / 100⌋
- Рейтинг: `/leaderboard` — топ-100, периоды «Всё время / Неделя / День»
- Мини-рейтинг «Сетки дня» — прямо на странице `/grid/day` (день/неделя)
