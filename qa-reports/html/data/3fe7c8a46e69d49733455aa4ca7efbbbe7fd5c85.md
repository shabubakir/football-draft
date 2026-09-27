# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation\header.spec.ts >> Header / Navigation >> все пункты навигации (desktop + dropdown) ведут на существующие страницы
- Location: tests\navigation\header.spec.ts:26:7

# Error details

```
Error: СЕТКА 9 ОНЛАЙН

expect(locator).toBeVisible() failed

Locator: locator('header').locator('nav').first().getByRole('link', { name: 'СЕТКА 9 ОНЛАЙН' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - СЕТКА 9 ОНЛАЙН locator('header').locator('nav').first().getByRole('link', { name: 'СЕТКА 9 ОНЛАЙН' }) with timeout 5000ms
  - waiting for locator('header').locator('nav').first().getByRole('link', { name: 'СЕТКА 9 ОНЛАЙН' })

```

```yaml
- main:
  - link "FOOTBALL DRAFT":
    - /url: /
  - navigation:
    - link "ИГРЫ":
      - /url: /
    - link "РЕЙТИНГ":
      - /url: /leaderboard
    - button "ВСЕ ИГРЫ":
      - text: ВСЕ ИГРЫ
      - img
    - link "ВОЙТИ":
      - /url: /login
  - text: FOOTBALL DRAFT · ИГРОВОЙ ЦЕНТР
  - heading "ВСЕ ФУТБОЛЬНЫЕ ИГРЫ В ОДНОМ МЕСТЕ." [level=1]:
    - text: ВСЕ ФУТБОЛЬНЫЕ
    - emphasis: ИГРЫ В ОДНОМ МЕСТЕ.
  - paragraph: "Играй с друзьями онлайн: угадай футболиста за 10 попыток или сразись в «Сетке 9» в реальном времени."
  - complementary:
    - text: ИГРАЙ С ДРУЗЬЯМИ ONLINE PvP в реальном времени
    - paragraph: Создай комнату, скинь код другу — и через минуту вы уже на поле. Без регистрации, без скачивания.
    - link "СОЗДАТЬ КОМНАТУ →":
      - /url: /grid/online
  - text: ВЫБЕРИ ИГРУ
  - button "Игрок ✎"
  - link "РЕЙТИНГ →":
    - /url: /leaderboard
  - link "ЕЖЕДНЕВНАЯ ИГРА УГАДАЙ ИГРОКА Найдите загаданного футболиста за 10 попыток по подсказкам. НОВЫЙ ИГРОК КАЖДЫЙ ДЕНЬ ИГРАТЬ →":
    - /url: /guess
    - text: ЕЖЕДНЕВНАЯ ИГРА
    - heading "УГАДАЙ ИГРОКА" [level=2]
    - paragraph: Найдите загаданного футболиста за 10 попыток по подсказкам.
    - text: НОВЫЙ ИГРОК КАЖДЫЙ ДЕНЬ ИГРАТЬ →
  - 'link "ЕЖЕДНЕВНАЯ ИГРА · РЕЙТИНГ СЕТКА ДНЯ Одна сетка на всех: заполните 9 пересечений, три ошибки — и провал. Результат попадает в общий рейтинг. ОДНА ИГРА В ДЕНЬ ИГРАТЬ →"':
    - /url: /grid/day
    - text: ЕЖЕДНЕВНАЯ ИГРА · РЕЙТИНГ
    - heading "СЕТКА ДНЯ" [level=2]
    - paragraph: "Одна сетка на всех: заполните 9 пересечений, три ошибки — и провал. Результат попадает в общий рейтинг."
    - text: ОДНА ИГРА В ДЕНЬ ИГРАТЬ →
  - link "ОНЛАЙН · С ДРУЗЬЯМИ СЕТКА 9 ОНЛАЙН Найдите соперника и сыграйте в футбольные крестики-нолики по 9 пересечениям. С ДРУГОМ · БЕЗ ЛИМИТОВ СОЗДАТЬ КОМНАТУ →":
    - /url: /grid/online
    - text: ОНЛАЙН · С ДРУЗЬЯМИ
    - heading "СЕТКА 9 ОНЛАЙН" [level=2]
    - paragraph: Найдите соперника и сыграйте в футбольные крестики-нолики по 9 пересечениям.
    - text: С ДРУГОМ · БЕЗ ЛИМИТОВ СОЗДАТЬ КОМНАТУ →
  - link "ОНЛАЙН · ДО 5 ИГРОКОВ ВИКТОРИНА Футбольные вопросы, 15 секунд на ответ, прямая таблица лидеров. Хост создаёт комнату, друзья подключаются по коду. 10 ВОПРОСОВ · РЕАЛЬНОЕ ВРЕМЯ ИГРАТЬ В 5-ЕРКУ →":
    - /url: /quiz/online
    - text: ОНЛАЙН · ДО 5 ИГРОКОВ
    - heading "ВИКТОРИНА" [level=2]
    - paragraph: Футбольные вопросы, 15 секунд на ответ, прямая таблица лидеров. Хост создаёт комнату, друзья подключаются по коду.
    - text: 10 ВОПРОСОВ · РЕАЛЬНОЕ ВРЕМЯ ИГРАТЬ В 5-ЕРКУ →
  - link "ИСТОРИЧЕСКИЙ ТУРНИР ДРАФТ Соберите XI из исторических клубных составов (26 сезонов, 99 клубов) и проведите команду через турнир из 7 матчей. 11 ИГРОКОВ · 3 ПЕРЕБРОСА · 7 МАТЧЕЙ ИГРАТЬ →":
    - /url: /draft
    - text: ИСТОРИЧЕСКИЙ ТУРНИР
    - heading "ДРАФТ" [level=2]
    - paragraph: Соберите XI из исторических клубных составов (26 сезонов, 99 клубов) и проведите команду через турнир из 7 матчей.
    - text: 11 ИГРОКОВ · 3 ПЕРЕБРОСА · 7 МАТЧЕЙ ИГРАТЬ →
  - link "ЕЖЕДНЕВНАЯ ИГРА · РЕЙТИНГ ПУТЬ ФУТБОЛИСТА Угадайте футболиста по клубам его карьеры — чем раньше, тем больше очков. ЕЖЕДНЕВНЫЙ МАРШРУТ ИГРАТЬ →":
    - /url: /career
    - text: ЕЖЕДНЕВНАЯ ИГРА · РЕЙТИНГ
    - heading "ПУТЬ ФУТБОЛИСТА" [level=2]
    - paragraph: Угадайте футболиста по клубам его карьеры — чем раньше, тем больше очков.
    - text: ЕЖЕДНЕВНЫЙ МАРШРУТ ИГРАТЬ →
  - link "СИМУЛЯТОР CS2 КЕЙСЫ Открывай кейсы CS2 с реальными шансами Valve. 42 кейса, 657 скинов, 1851 нож и перчатки. РЕАЛЬНЫЕ ШАНСЫ · АНИМАЦИЯ ПРОКРУТА ПРОКРУТИТЬ →":
    - /url: /cs2
    - text: СИМУЛЯТОР
    - heading "CS2 КЕЙСЫ" [level=2]
    - paragraph: Открывай кейсы CS2 с реальными шансами Valve. 42 кейса, 657 скинов, 1851 нож и перчатки.
    - text: РЕАЛЬНЫЕ ШАНСЫ · АНИМАЦИЯ ПРОКРУТА ПРОКРУТИТЬ →
  - link "MINI-GAME · REACTION CS2 AIM 30 seconds of clicking targets. We measure your reaction speed, accuracy, and best score. 30 SEC · 4 TARGET SIZES PLAY →":
    - /url: /cs2/aim
    - text: MINI-GAME · REACTION
    - heading "CS2 AIM" [level=2]
    - paragraph: 30 seconds of clicking targets. We measure your reaction speed, accuracy, and best score.
    - text: 30 SEC · 4 TARGET SIZES PLAY →
  - link "MINI-GAME · PRICES CS2 HIGHER / LOWER Two skins from the case database — guess which one is more expensive. 10 rounds, with streaks and bonuses. 10 ROUNDS · REAL PRICES PLAY →":
    - /url: /cs2/higher-lower
    - text: MINI-GAME · PRICES
    - heading "CS2 HIGHER / LOWER" [level=2]
    - paragraph: Two skins from the case database — guess which one is more expensive. 10 rounds, with streaks and bonuses.
    - text: 10 ROUNDS · REAL PRICES PLAY →
  - link "MYSTERY · UNLIMITED FOOTBALL AKINATOR Загадай любого человека, клуб или объект из мира футбола. Я попробую угадать его за несколько вопросов. БЕСКОНЕЧНЫЕ ВОПРОСЫ · ИСТИННАЯ ЛОГИКА ИГРАТЬ →":
    - /url: /akinator
    - text: MYSTERY · UNLIMITED
    - heading "FOOTBALL AKINATOR" [level=2]
    - paragraph: Загадай любого человека, клуб или объект из мира футбола. Я попробую угадать его за несколько вопросов.
    - text: БЕСКОНЕЧНЫЕ ВОПРОСЫ · ИСТИННАЯ ЛОГИКА ИГРАТЬ →
  - link "МИНИ-ИГРА · МИР GEOGUESSR LITE Угадай место на карте по фотографии. 5 раундов. Чем ближе ты поставишь точку — тем больше очков получишь. 5 РАУНДОВ · ВСЕ КОНТИНЕНТЫ · КАЗАХСТАН ИГРАТЬ →":
    - /url: /geoguessr
    - text: МИНИ-ИГРА · МИР
    - heading "GEOGUESSR LITE" [level=2]
    - paragraph: Угадай место на карте по фотографии. 5 раундов. Чем ближе ты поставишь точку — тем больше очков получишь.
    - text: 5 РАУНДОВ · ВСЕ КОНТИНЕНТЫ · КАЗАХСТАН ИГРАТЬ →
  - paragraph:
    - text: Football Draft · сделано для игры с друзьями ·
    - button "Сообщить об ошибке в базе"
  - navigation:
    - link "Правила":
      - /url: /legal
- alert
```

# Test source

```ts
  1  | import { test, expect, Page } from "@playwright/test";
  2  | 
  3  | // Все пункты меню навигации ведут на существующие страницы
  4  | const NAV_LINKS: Array<[string, string]> = [
  5  |   ["СЕТКА 9 ОНЛАЙН", "/grid/online"],
  6  |   ["ДРАФТ", "/draft"],
  7  |   ["УГАДАЙ ИГРОКА", "/guess"],
  8  |   ["ПУТЬ ФУТБОЛИСТА", "/career"],
  9  |   ["ВИКТОРИНА", "/quiz/online"],
  10 |   ["CS2 КЕЙСЫ", "/cs2"],
  11 |   ["CS2 AIM", "/cs2/aim"],
  12 |   ["CS2 HIGHER/LOWER", "/cs2/higher-lower"],
  13 |   ["AKINATOR", "/akinator"],
  14 |   ["GEOGUESSR", "/geoguessr"],
  15 | ];
  16 | 
  17 | async function openDropdown(page: Page) {
  18 |   const nav = page.locator("header").locator("nav").first();
  19 |   // Клик — надёжнее hover в headless (и это нормальный UX-путь)
  20 |   await nav.getByRole("button", { name: /ВСЕ ИГРЫ/ }).click();
  21 |   await page.waitForTimeout(300);
  22 |   return nav;
  23 | }
  24 | 
  25 | test.describe("Header / Navigation", () => {
  26 |   test("все пункты навигации (desktop + dropdown) ведут на существующие страницы", async ({ page }) => {
  27 |     await page.goto("/");
  28 |     const nav = page.locator("header").locator("nav").first();
  29 |     await expect(nav.getByRole("link", { name: "ИГРЫ", exact: true })).toHaveAttribute("href", "/");
  30 |     await expect(nav.getByRole("link", { name: "РЕЙТИНГ" })).toHaveAttribute("href", "/leaderboard");
  31 | 
  32 |     for (const [label, href] of NAV_LINKS) {
  33 |       const nav2 = await openDropdown(page);
  34 |       const link = nav2.getByRole("link", { name: label });
> 35 |       await expect(link, label).toBeVisible({ timeout: 5000 });
     |                                 ^ Error: СЕТКА 9 ОНЛАЙН
  36 |       await expect(link, "href для " + label).toHaveAttribute("href", href);
  37 |     }
  38 |   });
  39 | 
  40 |   test("переход по каждому пункту работает (не 404)", async ({ page }) => {
  41 |     const bad: string[] = [];
  42 |     for (const [, href] of NAV_LINKS) {
  43 |       const r = await page.goto(href, { waitUntil: "domcontentloaded" });
  44 |       if (r && r.status() >= 400) bad.push(`${href} → ${r.status()}`);
  45 |       const len = await page.evaluate(() => document.body.innerText.length);
  46 |       if (len < 10) bad.push(href + " → empty body");
  47 |     }
  48 |     expect(bad, bad.join(" | ")).toHaveLength(0);
  49 |   });
  50 | 
  51 |   test("логотип ведёт на главную", async ({ page }) => {
  52 |     await page.goto("/draft");
  53 |     await page.locator("header a").first().click();
  54 |     await expect(page).toHaveURL("http://localhost:3000/", { timeout: 10000 });
  55 |   });
  56 | 
  57 |   test("ВОЙТИ ведёт на /login (desktop)", async ({ page }) => {
  58 |     await page.goto("/");
  59 |     await page.waitForTimeout(500);
  60 |     await page.locator("header nav").getByRole("link", { name: "ВОЙТИ" }).click();
  61 |     await expect(page).toHaveURL("http://localhost:3000/login", { timeout: 10000 });
  62 |   });
  63 | 
  64 |   test("back/forward работает без потери состояния навигации", async ({ page }) => {
  65 |     await page.goto("/");
  66 |     await page.waitForTimeout(500);
  67 |     await page.locator("header nav").getByRole("link", { name: "ДРАФТ" }).click();
  68 |     await expect(page).toHaveURL("**/draft");
  69 |     await page.goBack();
  70 |     await expect(page).toHaveURL("http://localhost:3000/", { timeout: 10000 });
  71 |     await page.goForward();
  72 |     await expect(page).toHaveURL("**/draft");
  73 |   });
  74 | });
  75 | 
  76 | test.describe("Header / Navigation (mobile)", () => {
  77 |   test("mobile menu открывается и содержит пункты", async ({ browser, context }) => {
  78 |     const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  79 |     await page.goto("/");
  80 |     const burger = page.locator("header button[aria-label='Меню']");
  81 |     await expect(burger).toBeVisible();
  82 |     await burger.click();
  83 |     await page.waitForTimeout(400);
  84 |     const text = await page.evaluate(() => document.body.innerText);
  85 |     expect(text).toMatch(/ДРАФТ/);
  86 |     expect(text).toMatch(/AKINATOR/);
  87 |     await page.close();
  88 |     await context.close();
  89 |   });
  90 | });
  91 | 
```