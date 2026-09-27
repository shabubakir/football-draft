import { test, expect } from "@playwright/test";

// Akinator — угадай футболиста по вопросам
test.describe("Akinator", () => {
  test("страница рендерится, есть кнопка старта", async ({ page }) => {
    await page.goto("/akinator");
    await page.waitForTimeout(1500);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text.length).toBeGreaterThan(50);
    const btn = page.getByRole("button", { name: /НАЧАТЬ|START|ИГРАТЬ|ИГРА/i }).first();
    expect(await btn.count()).toBeGreaterThan(0);
  });

  test("вопросы появляются, кнопки ответа работают", async ({ page }) => {
    await page.goto("/akinator");
    await page.waitForTimeout(1000);
    const btn = page.getByRole("button", { name: /НАЧАТЬ|START|ИГРАТЬ|ИГРА/i }).first();
    await btn.click();
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    // Должен быть вопрос
    expect(text).toMatch(/\?/);
    // Кнопки ответа
    const daBtn = page.getByRole("button", { name: /Да|ДА|Yes/i }).first();
    expect(await daBtn.count()).toBeGreaterThan(0);
  });

  test("ответ Да/Нет двигает игру вперёд", async ({ page }) => {
    await page.goto("/akinator");
    await page.waitForTimeout(1000);
    const btn = page.getByRole("button", { name: /НАЧАТЬ|START|ИГРАТЬ|ИГРА/i }).first();
    await btn.click();
    await page.waitForTimeout(2000);
    // Отвечаем "Да" на первый вопрос
    const daBtn = page.getByRole("button", { name: /Да$|^Да|ДА/i }).first();
    if (await daBtn.count() > 0) {
      await daBtn.click();
      await page.waitForTimeout(1500);
      const text = await page.evaluate(() => document.body.innerText);
      expect(text).toMatch(/\?/);
    }
  });
});

// GeoGuessr
test.describe("GeoGuessr", () => {
  test("страница рендерится, есть кнопка старта", async ({ page }) => {
    await page.goto("/geoguessr");
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text.length).toBeGreaterThan(50);
    const btn = page.getByRole("button", { name: /НАЧАТЬ|START|ИГРАТЬ|ИГРА/i }).first();
    expect(await btn.count()).toBeGreaterThan(0);
  });
});
