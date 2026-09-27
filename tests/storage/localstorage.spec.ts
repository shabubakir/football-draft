import { test, expect } from "@playwright/test";

// LocalStorage corruption — страницы не должны падать при битых данных
test.describe("LocalStorage corruption", () => {
  test("битый guess_daily — страница грузится", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      localStorage.setItem("guess_daily_2025-09-27", "{invalid json!!");
    });
    await page.goto("/guess");
    await page.waitForTimeout(1500);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/УГАДАЙ/);
  });

  test("битый profile — страница грузится", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      localStorage.setItem("fd_device_id", "corrupted-not-uuid");
      localStorage.setItem("fd_device_name", 12345 as any);
    });
    await page.goto("/profile");
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text.length).toBeGreaterThan(10);
  });

  test("битый XP — страница грузится", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      localStorage.setItem("fd_xp", "{broken");
    });
    await page.goto("/");
    await page.waitForTimeout(1500);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/FOOTBALL/);
  });

  test("пустой localStorage — все страницы работают", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    for (const path of ["/guess", "/draft", "/career", "/quiz/online", "/akinator"]) {
      await page.goto(path);
      await page.waitForTimeout(1000);
      const text = await page.evaluate(() => document.body.innerText);
      expect(text.length, path).toBeGreaterThan(20);
    }
  });
});
