import { test, expect } from "@playwright/test";
import { attachConsole, filterCritical } from "../helpers";

test.describe("Главная страница", () => {
  test("hero + карточки игр + CTA рендерятся", async ({ page }) => {
    const sink = { errors: [] as string[], warnings: [] as string[] };
    attachConsole(page, sink);
    await page.goto("/");
    await page.waitForTimeout(1000);

    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/ВЫБЕРИ ИГРУ/);
    // карточки игр
    expect(text).toMatch(/УГАДАЙ ИГРОКА/);
    expect(text).toMatch(/СЕТКА ДНЯ/);
    expect(text).toMatch(/ДРАФТ/);
    expect(text).toMatch(/CS2/);

    const critical = filterCritical(sink.errors).filter(
      (e) => !/api\/cs2|skincash/i.test(e)
    );
    expect(critical).toHaveLength(0);
  });

  test("карточка игры открывает именно ту игру", async ({ page }) => {
    await page.goto("/");
    // карточка УГАДАЙ ИГРОКА
    const card = page.getByRole("link", { name: /УГАДАЙ ИГРОКА/ }).first();
    await card.click();
    await expect(page).toHaveURL("**/guess");
  });

  test("refresh главной не ломает страницу", async ({ page }) => {
    await page.goto("/");
    await page.reload();
    await page.waitForTimeout(1000);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/ВЫБЕРИ ИГРУ/);
  });
});
