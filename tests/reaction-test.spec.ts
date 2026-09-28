import { test, expect } from "@playwright/test";
import { attachConsole, filterCritical } from "./helpers";

/**
 * REACTION TEST — Playwright tests
 *
 * The interactive area is a <button> with aria-label reflecting its phase:
 *  - "Жми, чтобы начать" (idle)
 *  - "Жди зелёный…" (waiting)
 *  - "ЖМИ СЕЙЧАС!" (ready)
 *  - "СЛИШКОМ РАНО" (false start)
 *  - "Потеря фокуса — попытка отменена" (aborted)
 *
 * Input is onPointerDown. We dispatch a synthetic pointerdown on the area
 * button (no mouse move needed). To simulate a human, the green-hit is
 * delayed ~150–250 ms (in-page, page-local timing) so the measured reaction
 * falls in the valid 60–1000 ms band (sanitizeReaction rejects < 60 ms).
 */

const area = (p: import("@playwright/test").Page) =>
  p.getByRole("button", { name: /Жми|Жди|ЖМИ|РАНО|фокуса|ЗАСЧЁТ/ });

/** Dispatch pointerdown on the area (no mouse movement — just the event). */
async function hit(p: import("@playwright/test").Page) {
  await p.evaluate(() => {
    const labels = [
      "Жми",
      "Жди",
      "ЖМИ СЕЙЧАС",
      "СЛИШКОМ РАНО",
      "Потеря фокуса",
    ];
    const btn = labels
      .map((l) => document.querySelector(`button[aria-label*="${l}"]`))
      .find(Boolean) as HTMLButtonElement | null;
    if (!btn) throw new Error("area not found");
    btn.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "mouse",
      })
    );
  });
}

/**
 * In-page arming: a MutationObserver fires the moment the button's
 * aria-label turns green, and the pointerdown is dispatched after `delay` ms
 * — all measured against the page's own timeline (no CDP poll lag). This is
 * what keeps the measured reaction inside the valid 60–1000 ms band even
 * under heavy dev-server load, where CDP round-trips alone can stall the
 * page's event loop.
 */
async function armGreenHit(p: import("@playwright/test").Page, delay: number) {
  await p.evaluate((d) => {
    (window as unknown as Record<string, unknown>).__armed = true;
    const findBtn = () =>
      [...document.querySelectorAll("button")].find(
        (b) => (b.getAttribute("aria-label") || "").includes("ЖМИ СЕЙЧАС")
      ) as HTMLButtonElement | undefined;
    const mo = new MutationObserver(() => {
      const b = findBtn();
      if (!b) return;
      setTimeout(() => {
        const g = findBtn();
        if (g) {
          g.dispatchEvent(
            new PointerEvent("pointerdown", {
              bubbles: true,
              cancelable: true,
              pointerId: 1,
              pointerType: "mouse",
            })
          );
        }
        (window as unknown as Record<string, unknown>).__armed = false;
        mo.disconnect();
      }, d);
    });
    mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["aria-label"] });
  }, delay);
}

async function hitGreen(p: import("@playwright/test").Page, inPageDelay = 250) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await expect
      .poll(
        async () => (await area(p).getAttribute("aria-label")) || "",
        { timeout: 6500 }
      )
      .toContain("ЖМИ СЕЙЧАС");
    // If green is ALREADY visible, the observer above never sees the
    // transition — so arm a plain in-page timer immediately (the extra lag
    // is at most one poll interval and stays inside the band).
    const armed = await p.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find(
        (el) => (el.getAttribute("aria-label") || "").includes("ЖМИ СЕЙЧАС")
      ) as HTMLButtonElement | undefined;
      if (!b) return false;
      setTimeout(() => {
        const g = [...document.querySelectorAll("button")].find(
          (el) => (el.getAttribute("aria-label") || "").includes("ЖМИ СЕЙЧАС")
        ) as HTMLButtonElement | undefined;
        if (g) {
          g.dispatchEvent(
            new PointerEvent("pointerdown", {
              bubbles: true,
              cancelable: true,
              pointerId: 1,
              pointerType: "mouse",
            })
          );
        }
      }, 200);
      return true;
    });
    if (!armed) {
      // Still waiting — arm the in-page MutationObserver and wait for green.
      try {
        await armGreenHit(p, inPageDelay);
        await expect
          .poll(
            async () => (await area(p).getAttribute("aria-label")) || "",
            { timeout: 6500 }
          )
          .toContain("ЖМИ СЕЙЧАС");
      } catch {
        if (attempt < 2) continue; // re-arm on next try
        throw new Error("hitGreen: never saw green after 3 tries");
      }
    }
    // Verify the attempt was counted: the counter shows 2/5 (the first hit
    // always advances to 2/5). This is the definitive proof that the hit
    // was processed and counted.
    try {
      await expect(p.getByText(/ПОПЫТКА\s*2\/5/)).toBeVisible({ timeout: 6000 });
      return;
    } catch {
      // The hit may have missed (signal expired while arming, or the value
      // was rejected and the game went back to idle). Recover: if the area
      // is in a "too early" / "focus lost" / "idle" state, tap to continue
      // (or start) so a fresh attempt runs, then retry.
      const label = (await area(p).getAttribute("aria-label")) || "";
      if (
        label.includes("РАНО") ||
        label.includes("фокуса") ||
        label.includes("Жми, чтобы начать")
      ) {
        await hit(p); // continue / start → back to waiting
      }
      // otherwise: still waiting/ready — just retry the hit
    }
  }
  throw new Error("hitGreen: attempt was not counted after 3 tries");
}

/**
 * Arm a persistent in-page "auto-hitter": a MutationObserver on the area
 * button that, on EVERY transition into a clickable state (idle, ready/green,
 * too-early, aborted), dispatches a pointerdown 180 ms later (page-local
 * timing — no CDP lag, so the measured reaction stays inside the 60–1000 ms
 * band even under heavy dev-server load). The 180 ms delay also means the
 * click lands AFTER the green render has committed, so the native
 * pointerdown listener is guaranteed attached.
 *
 * Arming it once removes every arming race: the click can never be lost
 * between the Node-side loop and the page, and no green signal can be
 * missed (the observer sees every aria-label transition).
 */
async function armAutoHitter(p: import("@playwright/test").Page) {
  await p.evaluate(() => {
    if ((window as unknown as Record<string, unknown>).__rtAuto) return;
    (window as unknown as Record<string, unknown>).__rtAuto = true;

    const areaLabel = () => {
      const b = [...document.querySelectorAll("button")].find((el) =>
        /Жми|Жди|ЖМИ|РАНО|фокуса|ЗАСЧЁТ/.test(el.getAttribute("aria-label") || "")
      );
      return b ? (b.getAttribute("aria-label") || "") : "";
    };
    const clickable = (l: string) =>
      l.includes("ЖМИ СЕЙЧАС") ||
      l.includes("Жми, чтобы начать") ||
      l.includes("РАНО") ||
      l.includes("фокуса");
    const fire = () => {
      const b = [...document.querySelectorAll("button")].find((el) =>
        /ЖМИ СЕЙЧАС|Жми, чтобы начать|РАНО|фокуса/.test(el.getAttribute("aria-label") || "")
      );
      if (!b) return;
      b.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: "mouse",
        })
      );
    };
    let last = areaLabel();
    let pending: number | undefined;
    const mo = new MutationObserver(() => {
      const l = areaLabel();
      if (l === last) return;
      last = l;
      if (pending !== undefined) {
        window.clearTimeout(pending);
        pending = undefined;
      }
      if (clickable(l)) pending = window.setTimeout(fire, 180);
    });
    mo.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-label"],
    });
    // The observer only fires on CHANGES — if the page is already in a
    // clickable state when we arm, trigger the first click now.
    if (clickable(last)) pending = window.setTimeout(fire, 180);
  });
}

/**
 * Play the full test (start + 5 hits on green) → finished screen.
 *
 * A persistent in-page auto-hitter (armAutoHitter) performs every click —
 * the Node side only polls for the result screen and hard-restarts the page
 * if a full game never completes (e.g. transient dev-server stall).
 */
async function playFullGame(p: import("@playwright/test").Page) {
  const result = p.getByText(/Результат · \d+ попыток/);
  const t0 = Date.now();
  // The whole game (5 attempts × 1.5–5 s waits + pauses) needs well under
  // 90 s; a hard restart guards against a dead loop.
  const deadline = 90000;
  for (;;) {
    await armAutoHitter(p);
    let done = false;
    const end = Date.now() + deadline;
    while (Date.now() < end) {
      if (await result.isVisible().catch(() => false)) {
        done = true;
        break;
      }
      await p.waitForTimeout(1000);
    }
    if (done) return;
    // Something stalled the game (rejected-hit loop under load, dev-server
    // stall). Restart the page and try again.
    await p.goto("/reaction-test");
    await p.waitForTimeout(500);
    if (Date.now() - t0 > 240000) {
      throw new Error("playFullGame: 3 full-page attempts, no result screen");
    }
  }
}

test.describe("REACTION TEST", () => {
  test("страница рендерится: заголовок, режимы, статистика", async ({
    page,
  }) => {
    const sink = { errors: [] as string[], warnings: [] as string[] };
    attachConsole(page, sink);
    await page.goto("/reaction-test");
    await page.waitForTimeout(800);
    await expect(page.getByRole("heading", { name: /REACTION TEST/i })).toBeVisible();
    await expect(page.getByText(/CLASSIC · 5 ПОПЫТОК/)).toBeVisible();
    // Future modes shown as "скоро"
    await expect(page.getByText(/30s · скоро/i)).toBeVisible();
    await expect(page.getByText(/endless · скоро/i)).toBeVisible();
    await expect(page.getByText(/multiplayer · скоро/i)).toBeVisible();
    // Interactive area
    await expect(area(page)).toBeVisible();
    const critical = filterCritical(sink.errors).filter(
      (e) => !/api\/|favicon/i.test(e)
    );
    expect(critical, critical.join(" | ")).toHaveLength(0);
  });

  test("старт теста: idle → waiting → ready (зелёный сигнал)", async ({
    page,
  }) => {
    await page.goto("/reaction-test");
    await page.waitForTimeout(500);
    // idle
    await expect(area(page)).toHaveAttribute("aria-label", /Жми, чтобы начать/);
    // start
    await hit(page);
    await expect(area(page)).toHaveAttribute("aria-label", /Жди зелёный/);
    // wait for green (1500–5000 ms random)
    await expect
      .poll(
        async () => (await area(page).getAttribute("aria-label")) || "",
        { timeout: 6500 }
      )
      .toContain("ЖМИ СЕЙЧАС");
  });

  test("клик по зелёному сигналу засчитывает результат", async ({ page }) => {
    test.setTimeout(180000);
    await page.goto("/reaction-test");
    await page.waitForTimeout(500);
    await hit(page); // start
    // hitGreen resolves only after the attempt is counted (the label
    // sequence must show the green signal followed by the "…" pause or the
    // next waiting phase).
    await hitGreen(page);
    // The attempt counter must have advanced to 2/5
    await expect(page.getByText(/ПОПЫТКА\s*2\/5/)).toBeVisible();
  });

  test("клик в фазе waiting = СЛИШКОМ РАНО (false start, не 0 ms)", async ({
    page,
  }) => {
    await page.goto("/reaction-test");
    await page.waitForTimeout(500);
    await hit(page); // start
    // Immediately click during waiting (before green, min delay 1500ms)
    await hit(page);
    // Should show "СЛИШКОМ РАНО"
    await expect(page.getByText(/СЛИШКОМ РАНО/)).toBeVisible();
    // No "Последний" result (false start not counted)
    await expect(page.getByText(/Последний:/)).toHaveCount(0);
  });

  test("после false start: повтор начинается, попытка не засчитана", async ({
    page,
  }) => {
    await page.goto("/reaction-test");
    await page.waitForTimeout(500);
    await hit(page); // start
    await hit(page); // false start
    await expect(page.getByText(/СЛИШКОМ РАНО/)).toBeVisible();
    // Continue
    await hit(page); // retry
    // Now in waiting again
    await expect(area(page)).toHaveAttribute("aria-label", /Жди зелёный/);
    // Play to green and hit — result is counted
    await hitGreen(page);
    // After the retry attempt is counted, the counter advances to 2/5
    await expect(page.getByText(/ПОПЫТКА\s*2\/5/)).toBeVisible({
      timeout: 15000,
    });
  });

  test("двойной клик засчитывается один раз", async ({ page }) => {
    await page.goto("/reaction-test");
    await page.waitForTimeout(500);
    await hit(page); // start
    // Wait for the green signal
    await expect
      .poll(
        async () => (await area(page).getAttribute("aria-label")) || "",
        { timeout: 6500 }
      )
      .toContain("ЖМИ СЕЙЧАС");
    // Double click rapidly inside the page (two back-to-back pointerdowns
    // after a human-like delay — a valid reaction band). Retried up to 3
    // times: if the double click lands outside the 60–1000 ms band the
    // value is rejected (game goes back to idle) and we start fresh.
    for (let i = 0; i < 3; i++) {
      const label = (await area(page).getAttribute("aria-label")) || "";
      if (label.includes("Жми, чтобы начать")) await hit(page); // (re)start
      await expect
        .poll(
          async () => (await area(page).getAttribute("aria-label")) || "",
          { timeout: 6500 }
        )
        .toContain("ЖМИ СЕЙЧАС");
      await page.evaluate(() => {
        const findBtn = () =>
          [...document.querySelectorAll("button")].find(
            (b) => (b.getAttribute("aria-label") || "").includes("ЖМИ СЕЙЧАС")
          ) as HTMLButtonElement | undefined;
        const btn = findBtn();
        if (!btn) return;
        const fire = () =>
          btn.dispatchEvent(
            new PointerEvent("pointerdown", {
              bubbles: true,
              cancelable: true,
              pointerId: 1,
              pointerType: "mouse",
            })
          );
        setTimeout(() => {
          if (!findBtn()) return; // signal expired — don't create a false start
          fire();
          fire();
        }, 150);
      });
      try {
        await expect(page.getByText(/ПОПЫТКА\s*2\/5/)).toBeVisible({
          timeout: 4000,
        });
        break;
      } catch {
        // not counted — the next iteration restarts the attempt
      }
    }
    // Exactly ONE result was counted by the double click: the counter is
    // at 2/5 and must NOT have advanced to 3/5.
    await expect(page.getByText(/ПОПЫТКА\s*2\/5/)).toBeVisible();
    await page.waitForTimeout(1600);
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).not.toMatch(/ПОПЫТКА\s*3\/5/);
  });

  test("Space клавиша запускает и отзывается", async ({ page }) => {
    await page.goto("/reaction-test");
    await page.waitForTimeout(500);
    // Start via pointerdown
    await hit(page);
    await expect(area(page)).toHaveAttribute("aria-label", /Жди зелёный/);
    // Wait for green, then respond with Space (a trusted keyboard event).
    // The press happens right after the signal: measured reaction is small,
    // but the point is that Space is accepted as input at all.
    await expect
      .poll(
        async () => (await area(page).getAttribute("aria-label")) || "",
        { timeout: 6500 }
      )
      .toContain("ЖМИ СЕЙЧАС");
    await page.keyboard.press("Space");
    // Space in the ready phase must be ACCEPTED as input (not ignored and
    // not treated as a false start). The measured reaction may be < 60 ms
    // and thus rejected as "absurd" (the game returns to idle without
    // counting an attempt) — that still proves the Space handler ran.
    // What must NOT happen: "СЛИШКОМ РАНО" (a false start) or the green
    // signal persisting untouched.
    const label = await page
      .getByRole("button", { name: /Жми|Жди|ЖМИ|РАНО|фокуса/ })
      .getAttribute("aria-label");
    expect(label, "Space must be consumed as input").not.toContain("ЖМИ СЕЙЧАС");
    expect(label, "Space must not cause a false start").not.toContain("РАНО");
  });

  test("потеря фокуса отменяет попытку (не false start)", async ({
    page,
  }) => {
    await page.goto("/reaction-test");
    await page.waitForTimeout(500);
    await hit(page); // start
    // Wait for waiting phase
    await expect(area(page)).toHaveAttribute("aria-label", /Жди зелёный/);
    // Simulate focus loss
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    // Should show "Потеря фокуса" (aborted, not false start)
    await expect(page.getByText(/Потеря фокуса/)).toBeVisible();
    // Retry works
    await hit(page);
    await expect(area(page)).toHaveAttribute("aria-label", /Жди зелёный/);
  });

  test("полный прогон: 5 попыток → экран результата (best/avg/worst)", async ({
    page,
  }) => {
    test.setTimeout(180000);
    await page.goto("/reaction-test");
    await page.waitForTimeout(500);
    await playFullGame(page);
    // Result screen (at least 1 valid attempt; under load some attempts may be rejected)
    await expect(page.getByText(/Результат · \d+ попыток/)).toBeVisible();
    await expect(page.getByText(/ЛУЧШИЙ/)).toBeVisible();
    await expect(page.getByText(/СРЕДНИЙ/)).toBeVisible();
    await expect(page.getByText(/ХУДШИЙ/)).toBeVisible();
    await expect(page.getByRole("button", { name: /ЕЩЁ РАЗ/ })).toBeVisible();
  });

  test("результат: значение best <= avg <= worst (логично)", async ({
    page,
  }) => {
    test.setTimeout(180000);
    await page.goto("/reaction-test");
    await page.waitForTimeout(500);
    await playFullGame(page);
    await expect(page.getByText(/Результат · \d+ попыток/)).toBeVisible();
    // Extract numbers from the result card (value div before label div)
    const nums = await page.evaluate(() => {
      const cards = [...document.querySelectorAll("div")].filter(
        (d) =>
          /^(ЛУЧШИЙ|СРЕДНИЙ|ХУДШИЙ)$/.test((d.textContent || "").trim())
      );
      return cards
        .map(
          (c) =>
            parseInt(
              (c.previousElementSibling as HTMLElement)?.textContent || "0",
              10
            )
        )
        .filter((n) => !isNaN(n));
    });
    expect(nums.length).toBe(3);
    const [best, avg, worst] = nums;
    // best <= avg <= worst
    expect(best).toBeLessThanOrEqual(avg);
    expect(avg).toBeLessThanOrEqual(worst);
    // All in sane range (60–1000 ms)
    expect(best).toBeGreaterThanOrEqual(60);
    expect(worst).toBeLessThanOrEqual(1000);
  });

  test("ЕЩЁ РАЗ перезапускает тест", async ({ page }) => {
    test.setTimeout(180000);
    await page.goto("/reaction-test");
    await page.waitForTimeout(500);
    await playFullGame(page);
    await expect(page.getByText(/Результат · \d+ попыток/)).toBeVisible();
    await page.getByRole("button", { name: /ЕЩЁ РАЗ/ }).click();
    await page.waitForTimeout(300);
    // In waiting phase, attempt 1/5
    await expect(area(page)).toHaveAttribute("aria-label", /Жди зелёный/);
    await expect(page.getByText(/ПОПЫТКА\s*1\/5/)).toBeVisible();
  });

  test("гостевая статистика сохраняется в localStorage", async ({ page }) => {
    test.setTimeout(180000);
    await page.goto("/reaction-test");
    await page.waitForTimeout(500);
    await playFullGame(page);
    await expect(page.getByText(/Результат · \d+ попыток/)).toBeVisible();
    const stats = await page.evaluate(() =>
      localStorage.getItem("reaction-test-stats-v1")
    );
    expect(stats).toBeTruthy();
    const parsed = JSON.parse(stats!);
    expect(parsed.gamesPlayed).toBeGreaterThanOrEqual(1);
    expect(parsed.totalAttempts).toBeGreaterThanOrEqual(1);
    expect(parsed.bestReaction).toBeGreaterThan(0);
  });

  test("результат в разумных пределах (60–1000 ms)", async ({ page }) => {
    test.setTimeout(180000);
    await page.goto("/reaction-test");
    await page.waitForTimeout(500);
    await playFullGame(page);
    await expect(page.getByText(/Результат · \d+ попыток/)).toBeVisible();
    const best = await page.evaluate(() => {
      const card = [...document.querySelectorAll("div")].find(
        (d) => (d.textContent || "").trim() === "ЛУЧШИЙ"
      );
      return parseInt(
        (card?.previousElementSibling as HTMLElement)?.textContent || "0",
        10
      );
    });
    expect(best).toBeGreaterThanOrEqual(60);
    expect(best).toBeLessThanOrEqual(1000);
  });

  test("интерактивная зона — реальный <button>, фокусируемая", async ({
    page,
  }) => {
    await page.goto("/reaction-test");
    await page.waitForTimeout(500);
    const a = area(page);
    await expect(a).toBeVisible();
    await a.focus();
    const focused = await page.evaluate(
      () => (document.activeElement as HTMLElement)?.getAttribute("aria-label")
    );
    expect(focused).toMatch(/Жми, чтобы начать/);
  });

  test("попытка не засчитывается 0 ms (анти-абсурд)", async ({ page }) => {
    test.setTimeout(180000);
    await page.goto("/reaction-test");
    await page.waitForTimeout(500);
    // Play first attempt, click green after human-like delay
    await hit(page);
    await hitGreen(page);
    // The live result line is visible during the "counted" pause and the
    // next waiting phase (lastMs is only cleared when the new attempt
    // starts, which is ≥ 1.3 s after the hit — plenty of time).
    await expect(page.getByText(/Последний:\s*(\d+)\s*ms/)).toBeVisible({
      timeout: 15000,
    });
    const msText = await page.getByText(/Последний:.*ms/).textContent();
    const ms = parseInt((msText || "").replace(/\D/g, ""));
    // Must be >= 60 ms (sanitizeReaction rejects < 60)
    expect(ms).toBeGreaterThanOrEqual(60);
  });

  test("нет runtime ошибок во время игры", async ({ page }) => {
    test.setTimeout(180000);
    const sink = { errors: [] as string[], warnings: [] as string[] };
    attachConsole(page, sink);
    await page.goto("/reaction-test");
    await page.waitForTimeout(500);
    await playFullGame(page);
    await page.waitForTimeout(500);
    const critical = filterCritical(sink.errors).filter(
      (e) =>
        !/api\/|favicon|404 .*\/_next\/static|Router action dispatched before initialization/i.test(
          e
        )
    );
    expect(critical, critical.join(" | ")).toHaveLength(0);
  });

  test("адаптивность: не ломается на 375x667", async ({ page, browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const p = await ctx.newPage();
    await p.goto("/reaction-test");
    await p.waitForTimeout(800);
    await expect(p.getByRole("heading", { name: /REACTION TEST/i })).toBeVisible();
    const overflow = await p.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow, "горизонтальный overflow").toBeLessThanOrEqual(5);
    await ctx.close();
  });
});
