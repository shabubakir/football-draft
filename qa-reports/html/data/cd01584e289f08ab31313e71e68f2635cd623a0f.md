# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation\header.spec.ts >> Header / Navigation >> back/forward работает без потери состояния навигации
- Location: tests\navigation\header.spec.ts:64:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('header nav').getByRole('link', { name: 'ДРАФТ' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - link "FOOTBALL DRAFT" [ref=e4] [cursor=pointer]:
        - /url: /
        - text: FOOTBALLDRAFT
      - navigation [ref=e5]:
        - link "ИГРЫ" [ref=e6] [cursor=pointer]:
          - /url: /
        - link "РЕЙТИНГ" [ref=e7] [cursor=pointer]:
          - /url: /leaderboard
        - button "ВСЕ ИГРЫ" [ref=e9]
        - link "ВОЙТИ" [ref=e12] [cursor=pointer]:
          - /url: /login
    - generic [ref=e13]:
      - generic [ref=e14]:
        - text: FOOTBALL DRAFT · ИГРОВОЙ ЦЕНТР
        - heading [level=1] [ref=e15]:
          - text: ВСЕ ФУТБОЛЬНЫЕ
          - emphasis [ref=e16]: ИГРЫ В ОДНОМ МЕСТЕ.
        - paragraph [ref=e17]: "Играй с друзьями онлайн: угадай футболиста за 10 попыток или сразись в «Сетке 9» в реальном времени."
      - complementary [ref=e18]:
        - text: ИГРАЙ С ДРУЗЬЯМИ
        - generic [ref=e19]:
          - generic [ref=e20]: ONLINE
          - generic [ref=e21]: PvP в реальном времени
        - paragraph [ref=e22]: Создай комнату, скинь код другу — и через минуту вы уже на поле. Без регистрации, без скачивания.
        - link "СОЗДАТЬ КОМНАТУ →" [ref=e23] [cursor=pointer]:
          - /url: /grid/online
    - generic [ref=e24]:
      - generic [ref=e25]: ВЫБЕРИ ИГРУ
      - generic [ref=e26]:
        - button "Игрок ✎" [ref=e28]
        - link "РЕЙТИНГ →" [ref=e30] [cursor=pointer]:
          - /url: /leaderboard
    - generic [ref=e31]:
      - link "ЕЖЕДНЕВНАЯ ИГРА УГАДАЙ ИГРОКА Найдите загаданного футболиста за 10 попыток по подсказкам. НОВЫЙ ИГРОК КАЖДЫЙ ДЕНЬ ИГРАТЬ →" [ref=e32] [cursor=pointer]:
        - /url: /guess
        - generic [ref=e33]:
          - text: ЕЖЕДНЕВНАЯ ИГРА
          - heading "УГАДАЙ ИГРОКА" [level=2] [ref=e34]
          - paragraph [ref=e35]: Найдите загаданного футболиста за 10 попыток по подсказкам.
        - generic [ref=e36]:
          - generic [ref=e37]: НОВЫЙ ИГРОК КАЖДЫЙ ДЕНЬ
          - generic [ref=e38]: ИГРАТЬ →
      - 'link "ЕЖЕДНЕВНАЯ ИГРА · РЕЙТИНГ СЕТКА ДНЯ Одна сетка на всех: заполните 9 пересечений, три ошибки — и провал. Результат попадает в общий рейтинг. ОДНА ИГРА В ДЕНЬ ИГРАТЬ →" [ref=e39] [cursor=pointer]':
        - /url: /grid/day
        - generic [ref=e40]:
          - text: ЕЖЕДНЕВНАЯ ИГРА · РЕЙТИНГ
          - heading "СЕТКА ДНЯ" [level=2] [ref=e41]
          - paragraph [ref=e42]: "Одна сетка на всех: заполните 9 пересечений, три ошибки — и провал. Результат попадает в общий рейтинг."
        - generic [ref=e43]:
          - generic [ref=e44]: ОДНА ИГРА В ДЕНЬ
          - generic [ref=e45]: ИГРАТЬ →
      - link "ОНЛАЙН · С ДРУЗЬЯМИ СЕТКА 9 ОНЛАЙН Найдите соперника и сыграйте в футбольные крестики-нолики по 9 пересечениям. С ДРУГОМ · БЕЗ ЛИМИТОВ СОЗДАТЬ КОМНАТУ →" [ref=e46] [cursor=pointer]:
        - /url: /grid/online
        - generic [ref=e47]:
          - text: ОНЛАЙН · С ДРУЗЬЯМИ
          - heading "СЕТКА 9 ОНЛАЙН" [level=2] [ref=e48]
          - paragraph [ref=e49]: Найдите соперника и сыграйте в футбольные крестики-нолики по 9 пересечениям.
        - generic [ref=e50]:
          - generic [ref=e51]: С ДРУГОМ · БЕЗ ЛИМИТОВ
          - generic [ref=e52]: СОЗДАТЬ КОМНАТУ →
      - link "ОНЛАЙН · ДО 5 ИГРОКОВ ВИКТОРИНА Футбольные вопросы, 15 секунд на ответ, прямая таблица лидеров. Хост создаёт комнату, друзья подключаются по коду. 10 ВОПРОСОВ · РЕАЛЬНОЕ ВРЕМЯ ИГРАТЬ В 5-ЕРКУ →" [ref=e53] [cursor=pointer]:
        - /url: /quiz/online
        - generic [ref=e54]:
          - text: ОНЛАЙН · ДО 5 ИГРОКОВ
          - heading "ВИКТОРИНА" [level=2] [ref=e55]
          - paragraph [ref=e56]: Футбольные вопросы, 15 секунд на ответ, прямая таблица лидеров. Хост создаёт комнату, друзья подключаются по коду.
        - generic [ref=e57]:
          - generic [ref=e58]: 10 ВОПРОСОВ · РЕАЛЬНОЕ ВРЕМЯ
          - generic [ref=e59]: ИГРАТЬ В 5-ЕРКУ →
      - link "ИСТОРИЧЕСКИЙ ТУРНИР ДРАФТ Соберите XI из исторических клубных составов (26 сезонов, 99 клубов) и проведите команду через турнир из 7 матчей. 11 ИГРОКОВ · 3 ПЕРЕБРОСА · 7 МАТЧЕЙ ИГРАТЬ →" [ref=e60] [cursor=pointer]:
        - /url: /draft
        - generic [ref=e61]:
          - text: ИСТОРИЧЕСКИЙ ТУРНИР
          - heading "ДРАФТ" [level=2] [ref=e62]
          - paragraph [ref=e63]: Соберите XI из исторических клубных составов (26 сезонов, 99 клубов) и проведите команду через турнир из 7 матчей.
        - generic [ref=e64]:
          - generic [ref=e65]: 11 ИГРОКОВ · 3 ПЕРЕБРОСА · 7 МАТЧЕЙ
          - generic [ref=e66]: ИГРАТЬ →
      - link "ЕЖЕДНЕВНАЯ ИГРА · РЕЙТИНГ ПУТЬ ФУТБОЛИСТА Угадайте футболиста по клубам его карьеры — чем раньше, тем больше очков. ЕЖЕДНЕВНЫЙ МАРШРУТ ИГРАТЬ →" [ref=e67] [cursor=pointer]:
        - /url: /career
        - generic [ref=e68]:
          - text: ЕЖЕДНЕВНАЯ ИГРА · РЕЙТИНГ
          - heading "ПУТЬ ФУТБОЛИСТА" [level=2] [ref=e69]
          - paragraph [ref=e70]: Угадайте футболиста по клубам его карьеры — чем раньше, тем больше очков.
        - generic [ref=e71]:
          - generic [ref=e72]: ЕЖЕДНЕВНЫЙ МАРШРУТ
          - generic [ref=e73]: ИГРАТЬ →
      - link "СИМУЛЯТОР CS2 КЕЙСЫ Открывай кейсы CS2 с реальными шансами Valve. 42 кейса, 657 скинов, 1851 нож и перчатки. РЕАЛЬНЫЕ ШАНСЫ · АНИМАЦИЯ ПРОКРУТА ПРОКРУТИТЬ →" [ref=e74] [cursor=pointer]:
        - /url: /cs2
        - generic [ref=e75]:
          - text: СИМУЛЯТОР
          - heading "CS2 КЕЙСЫ" [level=2] [ref=e76]
          - paragraph [ref=e77]: Открывай кейсы CS2 с реальными шансами Valve. 42 кейса, 657 скинов, 1851 нож и перчатки.
        - generic [ref=e78]:
          - generic [ref=e79]: РЕАЛЬНЫЕ ШАНСЫ · АНИМАЦИЯ ПРОКРУТА
          - generic [ref=e80]: ПРОКРУТИТЬ →
      - link "MINI-GAME · REACTION CS2 AIM 30 seconds of clicking targets. We measure your reaction speed, accuracy, and best score. 30 SEC · 4 TARGET SIZES PLAY →" [ref=e81] [cursor=pointer]:
        - /url: /cs2/aim
        - generic [ref=e82]:
          - text: MINI-GAME · REACTION
          - heading "CS2 AIM" [level=2] [ref=e83]
          - paragraph [ref=e84]: 30 seconds of clicking targets. We measure your reaction speed, accuracy, and best score.
        - generic [ref=e85]:
          - generic [ref=e86]: 30 SEC · 4 TARGET SIZES
          - generic [ref=e87]: PLAY →
      - link "MINI-GAME · PRICES CS2 HIGHER / LOWER Two skins from the case database — guess which one is more expensive. 10 rounds, with streaks and bonuses. 10 ROUNDS · REAL PRICES PLAY →" [ref=e88] [cursor=pointer]:
        - /url: /cs2/higher-lower
        - generic [ref=e89]:
          - text: MINI-GAME · PRICES
          - heading "CS2 HIGHER / LOWER" [level=2] [ref=e90]
          - paragraph [ref=e91]: Two skins from the case database — guess which one is more expensive. 10 rounds, with streaks and bonuses.
        - generic [ref=e92]:
          - generic [ref=e93]: 10 ROUNDS · REAL PRICES
          - generic [ref=e94]: PLAY →
      - link "MYSTERY · UNLIMITED FOOTBALL AKINATOR Загадай любого человека, клуб или объект из мира футбола. Я попробую угадать его за несколько вопросов. БЕСКОНЕЧНЫЕ ВОПРОСЫ · ИСТИННАЯ ЛОГИКА ИГРАТЬ →" [ref=e95] [cursor=pointer]:
        - /url: /akinator
        - generic [ref=e96]:
          - text: MYSTERY · UNLIMITED
          - heading "FOOTBALL AKINATOR" [level=2] [ref=e97]
          - paragraph [ref=e98]: Загадай любого человека, клуб или объект из мира футбола. Я попробую угадать его за несколько вопросов.
        - generic [ref=e99]:
          - generic [ref=e100]: БЕСКОНЕЧНЫЕ ВОПРОСЫ · ИСТИННАЯ ЛОГИКА
          - generic [ref=e101]: ИГРАТЬ →
      - link "МИНИ-ИГРА · МИР GEOGUESSR LITE Угадай место на карте по фотографии. 5 раундов. Чем ближе ты поставишь точку — тем больше очков получишь. 5 РАУНДОВ · ВСЕ КОНТИНЕНТЫ · КАЗАХСТАН ИГРАТЬ →" [ref=e102] [cursor=pointer]:
        - /url: /geoguessr
        - generic [ref=e103]:
          - text: МИНИ-ИГРА · МИР
          - heading "GEOGUESSR LITE" [level=2] [ref=e104]
          - paragraph [ref=e105]: Угадай место на карте по фотографии. 5 раундов. Чем ближе ты поставишь точку — тем больше очков получишь.
        - generic [ref=e106]:
          - generic [ref=e107]: 5 РАУНДОВ · ВСЕ КОНТИНЕНТЫ · КАЗАХСТАН
          - generic [ref=e108]: ИГРАТЬ →
    - generic [ref=e109]:
      - paragraph [ref=e110]:
        - text: Football Draft · сделано для игры с друзьями ·
        - button "Сообщить об ошибке в базе" [ref=e112]
      - navigation [ref=e113]:
        - link "Правила" [ref=e114] [cursor=pointer]:
          - /url: /legal
  - button "Open Next.js Dev Tools" [ref=e120] [cursor=pointer]
  - alert [ref=e124]
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
  35 |       await expect(link, label).toBeVisible({ timeout: 5000 });
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
> 67 |     await page.locator("header nav").getByRole("link", { name: "ДРАФТ" }).click();
     |                                                                           ^ Error: locator.click: Test timeout of 60000ms exceeded.
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