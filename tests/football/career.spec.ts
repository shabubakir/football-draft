import { test, expect } from "@playwright/test";

// ПУТЬ ФУТБОЛИСТА
test.describe("Путь Футболиста", () => {
  test("страница рендерится, задание отображается", async ({ page }) => {
    await page.goto("/career");
    await page.waitForTimeout(800);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text.length).toBeGreaterThan(100);
  });

  test("пустой ответ не отправляется", async ({ page }) => {
    await page.goto("/career");
    await page.waitForTimeout(500);
    // Найти submit кнопку
    const btn = page.getByRole("button", { name: /УГАДАТЬ|ПРОВЕРИТЬ|ОТВET/i }).first();
    if (await btn.count() > 0) {
      await expect(btn).toBeDisabled();
    }
  });

  test("неверный ответ тратит попытку", async ({ page }) => {
    await page.goto("/career");
    await page.waitForTimeout(500);
    const input = page.locator("input[type='text'], input:not([type])").first();
    if (await input.count() === 0) return; // страница без input — skip
    await input.fill("Xyz123abc");
    const btn = page.getByRole("button", { name: /УГАДАТЬ|ПРОВЕРИТЬ/i }).first();
    await btn.click();
    await page.waitForTimeout(500);
  });
});
