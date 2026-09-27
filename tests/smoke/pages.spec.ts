import { test, expect } from "@playwright/test";
import { ROUTES, attachConsole, filterCritical } from "../helpers";

test.describe("Smoke — все страницы открываются", () => {
  for (const route of ROUTES) {
    test(`GET ${route} — открывается, нет runtime errors`, async ({ page }) => {
      const sink = { errors: [] as string[], warnings: [] as string[] };
      attachConsole(page, sink);

      const resp = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(resp?.status()).toBeLessThan(500);

      // Ждём, что страница не белая
      await page.waitForTimeout(1500);
      const text = await page.evaluate(() => document.body.innerText.trim());
      expect(text.length, "body пуст (белый экран) на " + route).toBeGreaterThan(10);

      // Нет "Something went wrong" / Not Found (Next error)
      const html = await page.content();
      expect(html, "Next.js error page на " + route).not.toMatch(/Application error:|Uncaught \(in \(Promise|Something went wrong/i);

      // Критические console errors
      const critical = filterCritical(sink.errors).filter(
        (e) => !/api\/cs2-(compare|prices)|skincash|ERR_CONNECTION|ECONNREFUSED/i.test(e)
      );
      expect(critical, "критические console errors на " + route + ": " + critical.slice(0, 5).join(" | ")).toHaveLength(0);
    });
  }

  test("неизвестный route → 404, не белый экран", async ({ page }) => {
    const resp = await page.goto("/definitely-not-a-page-xyz", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).toBe(404);
  });
});
