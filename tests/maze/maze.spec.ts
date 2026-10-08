import { test, expect } from "@playwright/test";
import { attachConsole, filterCritical } from "../helpers";

const mazeGame = () => `window.__mazeGame`;

async function startGame(page: import("@playwright/test").Page) {
  await page.goto("/maze");
  await expect(page.getByRole("heading", { name: /MAZE/ })).toBeVisible();
  await page.getByRole("button", { name: "НАЧАТЬ РЕЙД", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("КВОТА")).toBeVisible();
  const exposed = await page.evaluate(
    `!!${mazeGame()} && !!${mazeGame()}.player`
  );
  expect(exposed).toBe(true);
}

test.describe("THE MAZE — Extraction", () => {
  test("menu renders, help toggles, game starts with HUD and no console errors", async ({
    page,
  }) => {
    const sink = { errors: [] as string[], warnings: [] as string[] };
    attachConsole(page, sink);
    await page.goto("/maze");
    await expect(page.getByRole("heading", { name: /MAZE/ })).toBeVisible();
    for (const d of ["EASY", "NORMAL", "NIGHTMARE"]) {
      await expect(page.getByRole("button", { name: d })).toBeVisible();
    }
    await page.getByRole("button", { name: "КАК ИГРАТЬ" }).click();
    await expect(page.getByText("WASD")).toBeVisible();
    await page.getByRole("button", { name: "НАЧАТЬ РЕЙД", exact: true }).click();
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.getByText("КВОТА")).toBeVisible();
    expect(filterCritical(sink.errors)).toEqual([]);
  });

  test("WASD movement actually moves the player and flashlight F toggles", async ({
    page,
  }) => {
    const sink = { errors: [] as string[], warnings: [] as string[] };
    attachConsole(page, sink);
    await startGame(page);

    const p0 = await page.evaluate(
      `({ x: ${mazeGame()}.player.position.x, z: ${mazeGame()}.player.position.z })`
    );
    await page.keyboard.down("w");
    await page.waitForTimeout(1000);
    await page.keyboard.up("w");
    const p1 = await page.evaluate(
      `({ x: ${mazeGame()}.player.position.x, z: ${mazeGame()}.player.position.z })`
    );
    const moved = Math.hypot(p1.x - p0.x, p1.z - p0.z);
    expect(moved).toBeGreaterThan(1); // walking 4 m/s for 1s
    expect(moved).toBeLessThan(9);
    expect(Number.isNaN(p1.x) || Number.isNaN(p1.z)).toBe(false);

    // W must walk toward the camera facing direction (-Z at spawn yaw 0)
    expect(p1.z).toBeLessThan(p0.z);

    // Flashlight F toggle (edge-triggered, holding must not strobe)
    const f0 = await page.evaluate(`${mazeGame()}.player.flashlightOn`);
    expect(f0).toBe(true);
    await page.keyboard.press("f");
    expect(await page.evaluate(`${mazeGame()}.player.flashlightOn`)).toBe(
      false
    );
    await page.keyboard.press("f");
    expect(await page.evaluate(`${mazeGame()}.player.flashlightOn`)).toBe(
      true
    );

    // Sprint drains stamina, noise array stays bounded (no leak)
    await page.keyboard.down("Shift");
    await page.keyboard.down("w");
    await page.waitForTimeout(2500);
    await page.keyboard.up("w");
    await page.keyboard.up("Shift");
    const stamina = await page.evaluate(`${mazeGame()}.player.stamina`);
    expect(stamina).toBeLessThan(100);
    expect(stamina).toBeGreaterThanOrEqual(0);
    const noises = await page.evaluate(`${mazeGame()}.noises.length`);
    expect(noises).toBeLessThan(250);

    // Audio graph alive, no AudioContext errors
    const audioState = await page.evaluate(
      `({ state: ${mazeGame()}.audio.ctx ? ${mazeGame()}.audio.ctx.state : "none",
          ambient: ${mazeGame()}.audio.ambientNodes.length })`
    );
    expect(["running", "suspended", "interrupted"]).toContain(
      audioState.state
    );
    expect(audioState.ambient).toBeGreaterThan(0);

    expect(filterCritical(sink.errors)).toEqual([]);
  });

  test("monster catch -> shop screen -> next raid creates a new run", async ({
    page,
  }) => {
    const sink = { errors: [] as string[], warnings: [] as string[] };
    attachConsole(page, sink);
    await startGame(page);

    const seed0 = await page.evaluate(`${mazeGame()}.state.seed`);
    const dist0 = await page.evaluate(
      `${mazeGame()}.player.position.distanceTo(${mazeGame()}.monsterAI.position)`
    );
    expect(dist0).toBeGreaterThan(5); // monster spawns far away

    // Feed the player to the monster
    await page.evaluate(
      `${mazeGame()}.player.position.copy(${mazeGame()}.monsterAI.position)`
    );
    await expect(page.getByText("ПОЙМАН")).toBeVisible({ timeout: 10000 });

    // Game freezes after death — shop is showing, not the HUD
    await expect(page.getByText("СЛЕДУЮЩИЙ РЕЙД")).toBeVisible();

    // Next raid -> fresh run, new seed
    await page.getByRole("button", { name: "СЛЕДУЮЩИЙ РЕЙД" }).click();
    await expect(page.getByText("КВОТА")).toBeVisible();
    const seed1 = await page.evaluate(`${mazeGame()}.state.seed`);
    expect(seed1).not.toBe(seed0);
    const banked = await page.evaluate(`${mazeGame()}.state.banked`);
    expect(banked).toBe(0);

    expect(filterCritical(sink.errors)).toEqual([]);
  });

  test("bank quota + reach exit pad -> success -> shop", async ({ page }) => {
    const sink = { errors: [] as string[], warnings: [] as string[] };
    attachConsole(page, sink);
    await startGame(page);

    // Set banked to quota and teleport to the exit pad
    await page.evaluate(
      `${mazeGame()}.state.banked = ${mazeGame()}.state.quota;` +
        `${mazeGame()}.player.position.copy(${mazeGame()}.exitPosition);`
    );
    // Should trigger the win condition -> shop with "ЗАХВАТ УДАЛСЯ"
    await expect(page.getByText("ЗАХВАТ УДАЛСЯ")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("СЛЕДУЮЩИЙ РЕЙД")).toBeVisible();

    expect(filterCritical(sink.errors)).toEqual([]);
  });

  test("loot: pick up with E, drop with Q, bank at pad", async ({ page }) => {
    const sink = { errors: [] as string[], warnings: [] as string[] };
    attachConsole(page, sink);
    await startGame(page);

    // Check that loot items exist in the world
    const lootCount = await page.evaluate(`${mazeGame()}.loot.items.length`);
    expect(lootCount).toBeGreaterThan(0);

    // Find a ground loot item and teleport the player next to it
    const info = await page.evaluate(`(() => {
      const items = ${mazeGame()}.loot.items;
      const ground = items.find(i => i.state === "ground");
      if (!ground) return null;
      ${mazeGame()}.player.position.set(ground.position.x, 0, ground.position.z);
      return { id: ground.id, value: ground.value, weight: ground.weight };
    })()`);
    expect(info).not.toBeNull();

    // Press E to pick up
    await page.keyboard.press("e");
    await page.waitForTimeout(200);
    const held = await page.evaluate(
      `${mazeGame()}.heldLoot ? ${mazeGame()}.heldLoot.id : null`
    );
    expect(held).toBe(info.id);

    // Check carried value in state
    const carried = await page.evaluate(`${mazeGame()}.state.carried`);
    expect(carried).toBe(info.value);

    // Press Q to drop
    await page.keyboard.press("q");
    await page.waitForTimeout(200);
    const heldAfterDrop = await page.evaluate(
      `${mazeGame()}.heldLoot ? ${mazeGame()}.heldLoot.id : null`
    );
    expect(heldAfterDrop).toBeNull();

    // Pick up again and bank at the pad
    await page.evaluate(`(() => {
      const items = ${mazeGame()}.loot.items;
      const ground = items.find(i => i.state === "ground");
      if (ground) ${mazeGame()}.player.position.set(ground.position.x, 0, ground.position.z);
    })()`);
    await page.keyboard.press("e");
    await page.waitForTimeout(200);
    const held2 = await page.evaluate(
      `${mazeGame()}.heldLoot ? ${mazeGame()}.heldLoot.id : null`
    );
    expect(held2).not.toBeNull();

    // Teleport to the extraction pad — should bank the loot
    await page.evaluate(
      `${mazeGame()}.player.position.copy(${mazeGame()}.exitPosition);`
    );
    await page.waitForTimeout(300);
    const banked = await page.evaluate(`${mazeGame()}.state.banked`);
    expect(banked).toBeGreaterThan(0);

    expect(filterCritical(sink.errors)).toEqual([]);
  });

  test("shop: buy an upgrade with earned money", async ({ page }) => {
    const sink = { errors: [] as string[], warnings: [] as string[] };
    attachConsole(page, sink);
    await startGame(page);

    // Give the player money and bank some loot, then trigger death
    await page.evaluate(`(() => {
      ${mazeGame()}.economy.money = 10000;
      ${mazeGame()}.state.banked = ${mazeGame()}.state.quota;
      ${mazeGame()}.player.position.copy(${mazeGame()}.exitPosition);
    })()`);
    await expect(page.getByText("ЗАХВАТ УДАЛСЯ")).toBeVisible({ timeout: 10000 });

    // In the shop, the money should be displayed
    await expect(page.getByText("БЮДЖЕТ")).toBeVisible();

    // Try to buy the "Рюкзак" (capacity) upgrade
    const moneyBefore = await page.evaluate(`${mazeGame()}.economy.money`);
    await page.getByText("Рюкзак", { exact: true }).click();
    await page.waitForTimeout(200);
    const moneyAfter = await page.evaluate(`${mazeGame()}.economy.money`);
    expect(moneyAfter).toBeLessThan(moneyBefore);

    expect(filterCritical(sink.errors)).toEqual([]);
  });

  test("HUD survives 1280x720 and 1920x1080", async ({ page }) => {
    const sink = { errors: [] as string[], warnings: [] as string[] };
    attachConsole(page, sink);
    for (const vp of [
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(vp);
      await page.goto("/maze");
      await expect(page.getByRole("heading", { name: /MAZE/ })).toBeVisible();
      await page.getByRole("button", { name: "НАЧАТЬ РЕЙД", exact: true }).click();
      await expect(page.getByText("КВОТА")).toBeVisible();
      const size = await page.evaluate(
        `(() => { const c = document.querySelector("canvas"); return { w: c ? c.width : 0, h: c ? c.height : 0 }; })()`
      );
      expect(size.w).toBeGreaterThan(0);
      expect(size.h).toBeGreaterThan(0);
    }
    expect(filterCritical(sink.errors)).toEqual([]);
  });
});
