import { test, expect, Page } from "@playwright/test";

// Все пункты меню навигации ведут на существующие страницы
const NAV_LINKS: Array<[string, string]> = [
  ["СЕТКА 9 ОНЛАЙН", "/grid/online"],
  ["ДРАФТ", "/draft"],
  ["УГАДАЙ ИГРОКА", "/guess"],
  ["ПУТЬ ФУТБОЛИСТА", "/career"],
  ["ВИКТОРИНА", "/quiz/online"],
  ["CS2 КЕЙСЫ", "/cs2"],
  ["CS2 AIM", "/cs2/aim"],
  ["CS2 HIGHER/LOWER", "/cs2/higher-lower"],
  ["AKINATOR", "/akinator"],
  ["GEOGUESSR", "/geoguessr"],
];

async function openDropdown(page: Page) {
  const nav = page.locator("header").locator("nav").first();
  // Клик — надёжнее hover в headless (и это нормальный UX-путь)
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

    for (const [label, href] of NAV_LINKS) {
      const nav2 = await openDropdown(page);
      const link = nav2.getByRole("link", { name: label });
      await expect(link, label).toBeVisible({ timeout: 5000 });
      await expect(link, "href для " + label).toHaveAttribute("href", href);
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
    await page.locator("header nav").getByRole("link", { name: "ДРАФТ" }).click();
    await expect(page).toHaveURL("**/draft");
    await page.goBack();
    await expect(page).toHaveURL("http://localhost:3000/", { timeout: 10000 });
    await page.goForward();
    await expect(page).toHaveURL("**/draft");
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
