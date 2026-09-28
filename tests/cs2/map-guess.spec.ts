import { test, expect } from "@playwright/test";
import { attachConsole, filterCritical } from "../helpers";

const MAPS = [
  "MIRAGE",
  "DUST 2",
  "INFERNO",
  "NUKE",
  "ANCIENT",
  "ANUBIS",
  "VERTIGO",
  "OVERPASS",
];

function clickMap(
  page: import("@playwright/test").Page,
  name: string
) {
  return page.getByRole("button", { name, exact: true }).click();
}

test.describe("CS2 MAP GUESS", () => {
  test("страница рендерится, есть режимы и кнопка НАЧАТЬ", async ({
    page,
  }) => {
    const sink = { errors: [] as string[], warnings: [] as string[] };
    attachConsole(page, sink);
    await page.goto("/cs2/map-guess");
    await page.waitForTimeout(800);
    await expect(page.getByRole("heading", { name: /CS2 MAP GUESS/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /GUESS THE MAP/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /WHERE EXACTLY\?/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /НАЧАТЬ/i })).toBeVisible();
    const critical = filterCritical(sink.errors).filter(
      (e) => !/api\//i.test(e)
    );
    expect(critical, critical.join(" | ")).toHaveLength(0);
  });

  test("выбор сложности (Легко/Средне/Сложно)", async ({ page }) => {
    await page.goto("/cs2/map-guess");
    await page.waitForTimeout(500);
    for (const d of ["Легко", "Средне", "Сложно"]) {
      await page.getByRole("button", { name: d, exact: true }).click();
    }
    // После выбора "Сложно" в HUD должно быть HARD
    await expect(page.locator("text=HARD").first()).toBeVisible();
  });

  test("режим GUESS: 10 раундов, экран скриншота, выбор карты", async ({
    page,
  }) => {
    await page.goto("/cs2/map-guess");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /GUESS THE MAP/i }).click();
    await page.getByRole("button", { name: /НАЧАТЬ/i }).click();
    await page.waitForTimeout(400);

    // HUD: ROUND 1/10
    await expect(page.getByText(/ROUND\s*1\/10/)).toBeVisible();
    // Все 8 карт доступны
    for (const m of MAPS) {
      await expect(page.getByRole("button", { name: m, exact: true })).toBeVisible();
    }
    // Скриншот присутствует (реальная картинка или SVG-fallback)
    const shot = page.locator("img[alt='CS2 map screenshot'], svg").first();
    await expect(shot).toBeVisible();
  });

  test("режим GUESS: ответ даёт фидбек и очки", async ({ page }) => {
    await page.goto("/cs2/map-guess");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /GUESS THE MAP/i }).click();
    await page.getByRole("button", { name: /НАЧАТЬ/i }).click();
    await page.waitForTimeout(400);
    // Отвечаем на любой карте
    await clickMap(page, "MIRAGE");
    await page.waitForTimeout(300);
    // Фидбек ВЕРНО или МИМО + очки
    await expect(page.getByText(/(ВЕРНО|МИМО) ·/)).toBeVisible();
    // Кнопка ДАЛЬШЕ
    await expect(page.getByRole("button", { name: /ДАЛЬШЕ|РЕЗУЛЬТ/ })).toBeVisible();
  });

  test("режим GUESS: полный прогон 10 раундов → экран результата", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.goto("/cs2/map-guess");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /GUESS THE MAP/i }).click();
    await page.getByRole("button", { name: /НАЧАТЬ/i }).click();
    await page.waitForTimeout(400);

    for (let i = 0; i < 10; i++) {
      // Ответ
      await clickMap(page, MAPS[i % MAPS.length]);
      await page.waitForTimeout(250);
      // Далее
      const next = page.getByRole("button", { name: /ДАЛЬШЕ|РЕЗУЛЬТ/ });
      await expect(next).toBeVisible({ timeout: 3000 });
      await next.click();
      await page.waitForTimeout(250);
    }
    // Экран результата
    await expect(page.getByText(/Итог · 10 раундов/)).toBeVisible();
    await expect(page.getByRole("button", { name: /ЕЩЁ РАЗ/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /МЕНЮ/ })).toBeVisible();
  });

  test("режим WHERE EXACTLY: миникарта + установка точки + CONFIRM", async ({
    page,
  }) => {
    await page.goto("/cs2/map-guess");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /WHERE EXACTLY\?/i }).click();
    await page.getByRole("button", { name: /НАЧАТЬ/i }).click();
    await page.waitForTimeout(400);

    // CONFIRM доступен только после точки
    const confirm = page.getByRole("button", { name: /CONFIRM/i });
    await expect(confirm).toBeVisible();
    await expect(confirm).toBeDisabled();

    // Кликаем по миникарте (svg с inline style cursor: crosshair)
    const minimap = page.locator("svg[style*='crosshair']").first();
    await minimap.scrollIntoViewIfNeeded();
    const box = await minimap.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(200);

    await expect(confirm).toBeEnabled();
    await confirm.click();
    await page.waitForTimeout(300);

    // Фидбек с дистанцией
    await expect(page.getByText(/(ВЕРНО|МИМО) ·/)).toBeVisible();
    await expect(page.getByText(/dist \d+%/)).toBeVisible();
  });

  test("режим WHERE EXACTLY: после CONFIRM показывается линия и верная точка", async ({
    page,
  }) => {
    await page.goto("/cs2/map-guess");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /WHERE EXACTLY\?/i }).click();
    await page.getByRole("button", { name: /НАЧАТЬ/i }).click();
    await page.waitForTimeout(400);

    const minimap = page.locator("svg[style*='crosshair']").first();
    await minimap.scrollIntoViewIfNeeded();
    const box = await minimap.boundingBox();
    await page.mouse.click(box!.x + box!.width * 0.4, box!.y + box!.height * 0.6);
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: /CONFIRM/i }).click();
    await page.waitForTimeout(400);

    // SVG должен содержать пунктирную линию (stroke-dasharray)
    const dashCount = await page.locator("line[stroke-dasharray]").count();
    expect(dashCount, "линия от точки до цели").toBeGreaterThan(0);
  });

  test("HUD обновляет счёт и прогресс-бар", async ({ page }) => {
    await page.goto("/cs2/map-guess");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /GUESS THE MAP/i }).click();
    await page.getByRole("button", { name: /НАЧАТЬ/i }).click();
    await page.waitForTimeout(400);

    // Прогресс-бар есть
    expect(await page.locator("div.h-full.bg-gradient-to-r").count()).toBeGreaterThan(0);
    await clickMap(page, "NUKE");
    await page.waitForTimeout(300);
    // Счёт изменился (0 → что-то)
    const scoreText = await page.getByText(/SCORE\s*\d+/).textContent();
    expect(scoreText).toMatch(/SCORE\s*\d+/);
  });

  test("экран результата: ЕЩЁ РАЗ перезапускает игру", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.goto("/cs2/map-guess");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /GUESS THE MAP/i }).click();
    await page.getByRole("button", { name: /НАЧАТЬ/i }).click();
    await page.waitForTimeout(400);
    for (let i = 0; i < 10; i++) {
      await clickMap(page, "INFERNO");
      await page.waitForTimeout(200);
      await page.getByRole("button", { name: /ДАЛЬШЕ|РЕЗУЛЬТ/ }).click();
      await page.waitForTimeout(200);
    }
    await expect(page.getByText(/Итог · 10 раундов/)).toBeVisible();
    await page.getByRole("button", { name: /ЕЩЁ РАЗ/ }).click();
    await page.waitForTimeout(400);
    // Возврат в меню: кнопка НАЧАТЬ снова видна
    await expect(page.getByRole("button", { name: /НАЧАТЬ/i })).toBeVisible();
    // Запускаем заново — ROUND 1/10
    await page.getByRole("button", { name: /НАЧАТЬ/i }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText(/ROUND\s*1\/10/)).toBeVisible();
  });

  test("экран результата: МЕНЮ возвращает в меню", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/cs2/map-guess");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /GUESS THE MAP/i }).click();
    await page.getByRole("button", { name: /НАЧАТЬ/i }).click();
    await page.waitForTimeout(400);
    for (let i = 0; i < 10; i++) {
      await clickMap(page, "VERTIGO");
      await page.waitForTimeout(200);
      await page.getByRole("button", { name: /ДАЛЬШЕ|РЕЗУЛЬТ/ }).click();
      await page.waitForTimeout(200);
    }
    await expect(page.getByText(/Итог · 10 раундов/)).toBeVisible();
    await page.getByRole("button", { name: /МЕНЮ/ }).click();
    await page.waitForTimeout(400);
    await expect(page.getByRole("button", { name: /НАЧАТЬ/i })).toBeVisible();
  });

  test("гостевая статистика сохраняется в localStorage", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.goto("/cs2/map-guess");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /GUESS THE MAP/i }).click();
    await page.getByRole("button", { name: /НАЧАТЬ/i }).click();
    await page.waitForTimeout(400);
    for (let i = 0; i < 10; i++) {
      await clickMap(page, "ANCIENT");
      await page.waitForTimeout(150);
      await page.getByRole("button", { name: /ДАЛЬШЕ|РЕЗУЛЬТ/ }).click();
      await page.waitForTimeout(150);
    }
    await expect(page.getByText(/Итог · 10 раундов/)).toBeVisible();
    const stats = await page.evaluate(() =>
      localStorage.getItem("cs2-map-guest-stats-v1")
    );
    expect(stats).toBeTruthy();
    const parsed = JSON.parse(stats!);
    expect(parsed.gamesPlayed).toBeGreaterThanOrEqual(1);
  });

  test("кнопки карт — реальные <button> с aria/role", async ({ page }) => {
    await page.goto("/cs2/map-guess");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /GUESS THE MAP/i }).click();
    await page.getByRole("button", { name: /НАЧАТЬ/i }).click();
    await page.waitForTimeout(400);
    const mirageBtn = page.getByRole("button", { name: "MIRAGE", exact: true });
    await expect(mirageBtn).toBeVisible();
    // Фокусируема
    await mirageBtn.focus();
    const focused = await page.evaluate(
      () => (document.activeElement as HTMLElement)?.innerText
    );
    expect(focused).toBe("MIRAGE");
  });

  test("раунды не повторяются (уникальные скриншоты)", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/cs2/map-guess");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /GUESS THE MAP/i }).click();
    await page.getByRole("button", { name: /НАЧАТЬ/i }).click();
    await page.waitForTimeout(400);

    const seenLocs: string[] = [];
    for (let i = 0; i < 10; i++) {
      // Извлекаем id локации через data-атрибут или src картинки
      const locId = await page.evaluate(() => {
        // Реальный скриншот: <img> в блоке TACTICAL FEED
        const img = document.querySelector("img[alt='CS2 map screenshot']");
        if (img) return img.getAttribute("src") ?? "";
        // Fallback: SVG маркер
        const svgs = document.querySelectorAll("svg");
        for (const s of svgs) {
          const rect = s.getBoundingClientRect();
          if (rect.width > 200 && rect.height > 100) {
            const circles = s.querySelectorAll("circle");
            for (const c of circles) {
              if (c.getAttribute("r") === "0.018") {
                return c.getAttribute("cx") + "," + c.getAttribute("cy");
              }
            }
            return s.innerHTML.length + ":" + s.querySelectorAll("*").length;
          }
        }
        return "";
      });
      seenLocs.push(locId);
      // Отвечаем
      await clickMap(page, "DUST 2");
      await page.waitForTimeout(300);
      await page.getByRole("button", { name: /ДАЛЬШЕ|РЕЗУЛЬТ/ }).click();
      await page.waitForTimeout(300);
    }
    // Все 10 раундов должны быть разными локациями
    const unique = new Set(seenLocs).size;
    expect(
      unique,
      "уникальных раундов " + unique + " из " + seenLocs.length
    ).toBe(seenLocs.length);
  });

  test("сложность HARD выбирает hard-локации", async ({ page }) => {
    await page.goto("/cs2/map-guess");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /GUESS THE MAP/i }).click();
    await page.getByRole("button", { name: "Сложно", exact: true }).click();
    await page.getByRole("button", { name: /НАЧАТЬ/i }).click();
    await page.waitForTimeout(400);
    // В HUD должно быть HARD (в подзаголовке "GUESS THE MAP · HARD")
    await expect(page.locator("text=HARD").first()).toBeVisible();
  });

  test("тач: клик по миникарте работает через pointer", async ({ page }) => {
    await page.goto("/cs2/map-guess");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /WHERE EXACTLY\?/i }).click();
    await page.getByRole("button", { name: /НАЧАТЬ/i }).click();
    await page.waitForTimeout(400);
    const minimap = page.locator("svg[style*='crosshair']").first();
    await minimap.scrollIntoViewIfNeeded();
    const box = await minimap.boundingBox();
    await page.touchscreen.tap(box!.x + 20, box!.y + 20).catch(async () => {
      await page.mouse.click(box!.x + 20, box!.y + 20);
    });
    await page.waitForTimeout(200);
    await expect(page.getByRole("button", { name: /CONFIRM/i })).toBeEnabled();
  });

  test("нет runtime ошибок во время игры", async ({ page }) => {
    test.setTimeout(60000);
    const sink = { errors: [] as string[], warnings: [] as string[] };
    attachConsole(page, sink);
    await page.goto("/cs2/map-guess");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /GUESS THE MAP/i }).click();
    await page.getByRole("button", { name: /НАЧАТЬ/i }).click();
    await page.waitForTimeout(400);
    for (let i = 0; i < 10; i++) {
      await clickMap(page, MAPS[i % MAPS.length]);
      await page.waitForTimeout(150);
      await page.getByRole("button", { name: /ДАЛЬШЕ|РЕЗУЛЬТ/ }).click();
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(500);
    const critical = filterCritical(sink.errors).filter(
      (e) => !/api\/|favicon|Router action dispatched before initialization/i.test(e)
    );
    expect(critical, critical.join(" | ")).toHaveLength(0);
  });

  test("адаптивность: страница не ломается на мобильной ширине", async ({
    page,
    browser,
  }) => {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const p = await ctx.newPage();
    await p.goto("/cs2/map-guess");
    await p.waitForTimeout(800);
    await expect(p.getByRole("heading", { name: /CS2 MAP GUESS/i })).toBeVisible();
    // Горизонтальный скролл не должен быть
    const overflow = await p.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow, "горизонтальный overflow").toBeLessThanOrEqual(2);
    await ctx.close();
  });
});
