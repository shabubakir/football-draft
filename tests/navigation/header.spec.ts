import { test, expect, Page } from "@playwright/test";

// Все пункты меню навигации ведут на существующие страницы
// label → [href, категория мега-меню]
const NAV_LINKS: Array<[string, string, string]> = [
  ["СЕТКА 9 ОНЛАЙН", "/grid/online", "ФУТБОЛ"],
  ["ДРАФТ", "/draft", "ФУТБОЛ"],
  ["УГАДАЙ ИГРОКА", "/guess", "ФУТБОЛ"],
  ["ПУТЬ ФУТБОЛИСТА", "/career", "ФУТБОЛ"],
  ["ВИКТОРИНА", "/quiz/online", "ФУТБОЛ"],
  ["AKINATOR", "/akinator", "ФУТБОЛ"],
  ["CS2 КЕЙСЫ", "/cs2", "КИБЕРСПОРТ"],
  ["CS2 AIM", "/cs2/aim", "КИБЕРСПОРТ"],
  ["CS2 HIGHER/LOWER", "/cs2/higher-lower", "КИБЕРСПОРТ"],
  ["ВИКТОРИНА", "/quiz/geo", "ГЕОГРАФИЯ"],
  ["GEOGUESSR", "/geoguessr", "ГЕОГРАФИЯ"],
];

async function openDropdown(page: Page) {
  const nav = page.locator("header").locator("nav").first();
  await nav.getByRole("button", { name: /ВСЕ ИГРЫ/ }).click();
  await page.waitForTimeout(300);
  return nav;
}

test.describe("Header / Navigation", () => {
  test("все пункты навигации (desktop + dropdown) ведут на существующие страницы", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("header").locator("nav").first();
    await expect(nav.getByRole("link", { name: "ИГРЫ", exact: true })).toHaveAttribute("href", "/");
    await expect(nav.getByRole("link", { name: "РЕЙТИНГ" })).toHaveAttribute("href", "/leaderboard");

    // Открываем dropdown один раз
    await openDropdown(page);
    let lastCat = "";
    for (const [label, href, cat] of NAV_LINKS) {
      if (cat !== lastCat) {
        await nav.getByRole("menuitem", { name: cat }).click();
        await page.waitForTimeout(200);
        lastCat = cat;
      }
      // Ссылки в dropdown имеют role="menuitem".
      // У «ВИКТОРИНА» две карточки (футбол / география) — уточняем по href.
      const items = nav.getByRole("menuitem", { name: label });
      const item = (await items.count()) === 1
        ? items.first()
        : items.filter({ has: nav.locator(`[href="${href}"]`) }).first();
      await expect(item, label).toBeVisible({ timeout: 5000 });
      await expect(item, "href для " + label).toHaveAttribute("href", href);
    }
  });

  test("переход по каждому пункту работает (не 404)", async ({ page }) => {
    const bad: string[] = [];
    for (const [, href] of NAV_LINKS) {
      const r = await page.goto(href, { waitUntil: "domcontentloaded" });
      if (r && r.status() >= 400) bad.push(`${href} → ${r.status()}`);
      const len = await page.evaluate(() => document.body.innerText.length);
      if (len < 10) bad.push(href + " → empty body");
    }
    expect(bad, bad.join(" | ")).toHaveLength(0);
  });

  test("логотип ведёт на главную", async ({ page }) => {
    await page.goto("/draft");
    await page.locator("header a").first().click();
    await expect(page).toHaveURL("http://localhost:3000/", { timeout: 10000 });
  });

  test("ВОЙТИ ведёт на /login (desktop)", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    await page.locator("header nav").getByRole("link", { name: "ВОЙТИ" }).click();
    await expect(page).toHaveURL("http://localhost:3000/login", { timeout: 10000 });
  });

  test("back/forward работает без потери состояния навигации", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    // Открываем dropdown, выбираем категорию и кликаем на ДРАФТ
    const nav = page.locator("header").locator("nav").first();
    await nav.getByRole("button", { name: /ВСЕ ИГРЫ/ }).click();
    await page.waitForTimeout(300);
    await nav.getByRole("menuitem", { name: "ФУТБОЛ" }).click();
    await page.waitForTimeout(300);
    await nav.getByRole("menuitem", { name: "ДРАФТ" }).click();
    await page.waitForURL("http://localhost:3000/draft", { timeout: 10000 });
    await page.goBack();
    await expect(page).toHaveURL("http://localhost:3000/", { timeout: 10000 });
    await page.goForward();
    await expect(page).toHaveURL("http://localhost:3000/draft", { timeout: 10000 });
  });
});

test.describe("Header / Navigation (mobile)", () => {
  test("mobile menu открывается и содержит пункты", async ({ browser, context }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto("/");
    const burger = page.locator("header button[aria-label='Меню']");
    await expect(burger).toBeVisible();
    await burger.click();
    await page.waitForTimeout(400);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/ДРАФТ/);
    expect(text).toMatch(/AKINATOR/);
    await page.close();
    await context.close();
  });
});
