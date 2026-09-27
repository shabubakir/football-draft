import { test, expect } from "@playwright/test";

// Responsive — mobile (390x844) и tablet (768x1024)
test.describe("Responsive — Mobile 390x844", () => {
  test("главная: нет горизонтального скролла", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto("/");
    await page.waitForTimeout(1500);
    const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 5);
    expect(hasHScroll, "horizontal scroll на mobile главной").toBe(false);
    await page.close();
  });

  test("CS2 Cases: нет горизонтального скролла", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto("/cs2");
    await page.waitForTimeout(2000);
    const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 5);
    expect(hasHScroll, "horizontal scroll на mobile CS2").toBe(false);
    await page.close();
  });

  test("CS2 AIM: нет горизонтального скролла", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto("/cs2/aim");
    await page.waitForTimeout(1500);
    const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 5);
    expect(hasHScroll, "horizontal scroll на mobile AIM").toBe(false);
    await page.close();
  });

  test("CS2 Higher/Lower: нет горизонтального скролла", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto("/cs2/higher-lower");
    await page.waitForTimeout(2000);
    const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 5);
    expect(hasHScroll, "horizontal scroll на mobile HL").toBe(false);
    await page.close();
  });

  test("Akinator: нет горизонтального скролла", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto("/akinator");
    await page.waitForTimeout(1500);
    const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 5);
    expect(hasHScroll, "horizontal scroll на mobile Akinator").toBe(false);
    await page.close();
  });

  test("Угадай Игрока: нет горизонтального скролла", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto("/guess");
    await page.waitForTimeout(1500);
    const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 5);
    expect(hasHScroll, "horizontal scroll на mobile Guess").toBe(false);
    await page.close();
  });
});

test.describe("Responsive — Tablet 768x1024", () => {
  test("главная: нет горизонтального скролла", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
    await page.goto("/");
    await page.waitForTimeout(1500);
    const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 5);
    expect(hasHScroll, "horizontal scroll на tablet главной").toBe(false);
    await page.close();
  });

  test("CS2 Cases: нет горизонтального скролла", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
    await page.goto("/cs2");
    await page.waitForTimeout(2000);
    const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 5);
    expect(hasHScroll, "horizontal scroll на tablet CS2").toBe(false);
    await page.close();
  });
});
