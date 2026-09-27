import { test, expect } from "@playwright/test";

// УГАДАЙ ИГРОКА (Wordle-style, daily)
test.describe("Угадай Игрока", () => {
  test("страница рендерится, 10 попыток, 6 подсказок", async ({ page }) => {
    await page.goto("/guess");
    await page.waitForTimeout(800);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/УГАДАЙ/);
    expect(text).toMatch(/Попыток: 10 из 10/);
    expect(text).toMatch(/СТРАНА/);
    expect(text).toMatch(/ПОЗИЦИЯ/);
    expect(text).toMatch(/ТЕКУЩИЙ КЛУБ/);
  });

  test("пустой ответ не отправляется", async ({ page }) => {
    await page.goto("/guess");
    await page.waitForTimeout(500);
    const btn = page.getByRole("button", { name: "УГАДАТЬ" });
    await expect(btn).toBeDisabled();
  });

  test("неизвестный игрок → МИМО, попытка тратится", async ({ page }) => {
    await page.goto("/guess");
    await page.waitForTimeout(500);
    await page.getByPlaceholder(/Например/).fill("Xyztuvw12345");
    await page.getByRole("button", { name: "УГАДАТЬ" }).click();
    await page.waitForTimeout(500);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/МИМО/);
    expect(text).toMatch(/Попыток: 9 из 10/);
  });

  test("реальный игрок → УГАДАЛ или БЛИЗКО (не МИМО для известного)", async ({ page }) => {
    await page.goto("/guess");
    await page.waitForTimeout(500);
    await page.getByPlaceholder(/Например/).fill("Лионель Месси");
    await page.getByRole("button", { name: "УГАДАТЬ" }).click();
    await page.waitForTimeout(500);
    const text = await page.evaluate(() => document.body.innerText);
    // Месси либо цель, либо близок (страна/позиция/возраст/клуб)
    expect(text).toMatch(/УГАДАЛ|БЛИЗКО/);
  });

  test("двойной click не дублирует попытку", async ({ page }) => {
    await page.goto("/guess");
    await page.waitForTimeout(500);
    const input = page.getByPlaceholder(/Например/);
    const btn = page.getByRole("button", { name: "УГАДАТЬ" });
    await input.fill("Неизвестный111");
    // Быстрый двойной клик
    await btn.click({ clickCount: 2 });
    await page.waitForTimeout(600);
    const text = await page.evaluate(() => document.body.innerText);
    // Только одна попытка потрачена
    expect(text).toMatch(/Попыток: 9 из 10/);
    const count = (text.match(/✗ МИМО/g) || []).length;
    expect(count).toBe(1);
  });

  test("archive day: игра за прошлый день работает без XP", async ({ page }) => {
    await page.goto("/guess");
    await page.waitForTimeout(500);
    // Клик по первому (не сегодняшнему) дню
    const dayBtns = page.locator("button:has-text('.'):not(:has-text('УГАДАТЬ'))");
    const first = dayBtns.first();
    await first.click();
    await page.waitForTimeout(300);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/АРХИВ|повтор для практики/i);
  });

  test("refresh во время игры не ломает", async ({ page }) => {
    await page.goto("/guess");
    await page.waitForTimeout(500);
    await page.getByPlaceholder(/Например/).fill("Роналду");
    await page.getByRole("button", { name: "УГАДАТЬ" }).click();
    await page.waitForTimeout(400);
    await page.reload();
    await page.waitForTimeout(800);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/УГАДАЙ/);
  });
});
