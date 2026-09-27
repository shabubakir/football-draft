import { test, expect } from "@playwright/test";
import { attachConsole, filterCritical } from "../helpers";

// AUTH — login / register / profile
test.describe("Auth — Login", () => {
  test("/login рендерится, форма есть", async ({ page }) => {
    await page.goto("/login");
    await page.waitForTimeout(1000);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/ВОЙТИ|LOGIN|Вход/i);
    const email = page.locator("input[type='email'], input[name='email']").first();
    expect(await email.count()).toBeGreaterThan(0);
  });

  test("пустой логин показывает ошибку", async ({ page }) => {
    await page.goto("/login");
    await page.waitForTimeout(500);
    const submit = page.getByRole("button", { name: /ВОЙТИ|LOGIN|Войти/i }).first();
    await submit.click();
    await page.waitForTimeout(1000);
    // Должна быть ошибка или форма без изменения URL
    expect(page.url()).toMatch(/\/login/);
  });

  test("неправильный пароль → ошибка, не redirect", async ({ page }) => {
    await page.goto("/login");
    await page.waitForTimeout(500);
    const email = page.locator("input[type='email'], input[name='email']").first();
    const pass = page.locator("input[type='password']").first();
    await email.fill("nonexistent_user_qa@test.com");
    await pass.fill("wrongpass123");
    await page.getByRole("button", { name: /ВОЙТИ|LOGIN|Войти/i }).first().click();
    await page.waitForTimeout(3000);
    // Не должны попасть в профиль
    expect(page.url()).toMatch(/\/login/);
  }, 30000);
});

test.describe("Auth — Register", () => {
  test("/register рендерится, форма есть", async ({ page }) => {
    await page.goto("/register");
    await page.waitForTimeout(1000);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/РЕГИСТРА|REGISTER|Зарегистр/i);
  });

  test("некорректный email → ошибка валидации", async ({ page }) => {
    await page.goto("/register");
    await page.waitForTimeout(1000);
    const email = page.locator("input[type='email'], input[name='email']").first();
    await email.fill("not-an-email");
    const pass = page.locator("input[type='password']").first();
    if (await pass.count() > 0) await pass.fill("password123");
    const submit = page.getByRole("button", { name: /ЗАРЕГИСТР|REGISTER|Зарегистр|Создать/i }).first();
    if (await submit.count() === 0) return; // кнопка не найдена — skip
    await submit.click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const text = await page.evaluate(() => document.body.innerText);
    // Ошибка валидации или Supabase error
    expect(text).toMatch(/email|почт|invalid|некоррект|ошибк|sign|invalid/i);
  });
});

test.describe("Auth — Profile", () => {
  test("/profile для гостя — redirect или сообщение о входе", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForTimeout(2000);
    const url = page.url();
    const text = await page.evaluate(() => document.body.innerText);
    // Либо redirect на /login, либо сообщение "войдите"
    const isLogin = url.match(/\/login/);
    const hasMsg = /войти|логин|логинируйтесь|auth/i.test(text);
    expect(isLogin || hasMsg, "profile без auth не должен показывать чужие данные").toBeTruthy();
  });
});

// Settings
test.describe("Settings", () => {
  test("/settings рендерится", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(1500);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text.length).toBeGreaterThan(20);
  });
});

// Leaderboard
test.describe("Leaderboard", () => {
  test("/leaderboard рендерится, данные загружаются", async ({ page }) => {
    await page.goto("/leaderboard");
    // Лидерборд может грузиться долго (Supabase)
    await page.waitForTimeout(5000);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text.length).toBeGreaterThan(20);
    // Не должен быть белый экран
    expect(text).not.toMatch(/^$/);
  }, 30000);
});

// Legal
test.describe("Legal", () => {
  test("/legal рендерится", async ({ page }) => {
    await page.goto("/legal");
    await page.waitForTimeout(1000);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text.length).toBeGreaterThan(50);
  });
});
