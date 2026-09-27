# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation\header.spec.ts >> Header / Navigation (mobile) >> mobile menu открывается и содержит пункты
- Location: tests\navigation\header.spec.ts:77:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/
Call log:
  - navigating to "http://localhost:3000/", waiting until "load"

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
> 79 |     await page.goto("/");
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/
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