import { test, expect } from "@playwright/test";
import { attachConsole, filterCritical } from "../helpers";

// CS2 AIM — 30-секундный таймер, клики по целям
test.describe("CS2 AIM", () => {
  test("страница рендерится, есть кнопка START", async ({ page }) => {
    await page.goto("/cs2/aim");
    await page.waitForTimeout(1000);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text.length).toBeGreaterThan(50);
    // Должна быть кнопка старта
    const btn = page.getByRole("button", { name: /СТАРТ|START|Начать|ИГРАТЬ/i }).first();
    expect(await btn.count()).toBeGreaterThan(0);
  });

  test("игра запускается, таймер идёт, после 30с — результаты", async ({ page }) => {
    const sink = { errors: [] as string[], warnings: [] as string[] };
    attachConsole(page, sink);
    await page.goto("/cs2/aim");
    await page.waitForTimeout(800);
    const btn = page.getByRole("button", { name: /СТАРТ|START|Начать|ИГРАТЬ/i }).first();
    await btn.click();
    await page.waitForTimeout(1000);

    // Таймер должен быть виден (30 или чуть меньше)
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/\d+/);

    // Ждём окончания (30 сек + буфер)
    await page.waitForTimeout(32000);
    const finalText = await page.evaluate(() => document.body.innerText);
    // Должны быть результаты
    expect(finalText).toMatch(/ХИТ|ПОПАД|ТОЧН|ACCURACY|ACC|РЕЗУЛЬТ|SCORE|ОЧК|РЕАКЦ|ИТОГ/i);
  }, 60000);

  test("score не меняется после окончания", async ({ page }) => {
    await page.goto("/cs2/aim");
    await page.waitForTimeout(800);
    const btn = page.getByRole("button", { name: /СТАРТ|START|Начать|ИГРАТЬ/i }).first();
    await btn.click();
    await page.waitForTimeout(32000);
    const text1 = await page.evaluate(() => document.body.innerText);
    await page.waitForTimeout(2000);
    const text2 = await page.evaluate(() => document.body.innerText);
    // Результаты должны совпадать (score заморожен)
    const score1 = text1.match(/(\d+)/)?.[1];
    const score2 = text2.match(/(\d+)/)?.[1];
    if (score1 && score2) {
      expect(score1, "score изменился после окончания").toBe(score2);
    }
  }, 60000);
});

// CS2 HIGHER/LOWER — 10 раундов, угадывание цены
test.describe("CS2 Higher/Lower", () => {
  test("страница рендерится, 2 скина видны, кнопки ответа есть", async ({ page }) => {
    const sink = { errors: [] as string[], warnings: [] as string[] };
    attachConsole(page, sink);
    await page.goto("/cs2/higher-lower");
    await page.waitForTimeout(3000);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/HIGHER\s*/i);
    expect(text).toMatch(/ROUND 1\s*\/\s*10/);
    // Кнопки ответа
    const leftBtn = page.getByRole("button", { name: /LEFT|A ДОРОЖЕ/i });
    const rightBtn = page.getByRole("button", { name: /RIGHT|B ДОРОЖЕ/i });
    expect(await leftBtn.count()).toBeGreaterThan(0);
    expect(await rightBtn.count()).toBeGreaterThan(0);
  });

  test("клик по кнопке ответа показывает результат и NEXT ROUND", async ({ page }) => {
    await page.goto("/cs2/higher-lower");
    await page.waitForTimeout(3000);
    const rightBtn = page.getByRole("button", { name: /RIGHT|B ДОРОЖЕ/i });
    await rightBtn.click();
    await page.waitForTimeout(3000);
    const text = await page.evaluate(() => document.body.innerText);
    // После ответа: цена второго скина видна, ✓/✗, NEXT ROUND
    expect(text).toMatch(/CORRECT|WRONG|✓|✗/);
    expect(text).toMatch(/NEXT ROUND|ИТОГ/i);
    // Цена второго скина теперь видна
    expect(text).toMatch(/\$\s*\d+/);
  }, 60000);
});

// CS2 Cases
test.describe("CS2 Cases", () => {
  test("страница рендерится, список кейсов виден", async ({ page }) => {
    await page.goto("/cs2");
    await page.waitForTimeout(1500);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text.length).toBeGreaterThan(100);
    expect(text).toMatch(/КЕЙС|CASE|КЕЙСЫ|CASES/i);
  });

  test("кейсы отображаются с ценами ($)", async ({ page }) => {
    await page.goto("/cs2");
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    // Цены кейсов в $ (например $757)
    expect(text).toMatch(/\$\s*\d+/);
  });
});
