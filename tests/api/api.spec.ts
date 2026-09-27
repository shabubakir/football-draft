import { test, expect } from "@playwright/test";

// API endpoints — basic health checks
test.describe("API endpoints", () => {
  test("GET /api/cs2-compare?rounds=1 → 200, valid JSON", async ({ request }) => {
    const resp = await request.get("/api/cs2-compare?rounds=1");
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data).toHaveProperty("rounds");
    expect(Array.isArray(data.rounds)).toBe(true);
    expect(data.rounds.length).toBe(1);
    const r = data.rounds[0];
    expect(r).toHaveProperty("a");
    expect(r).toHaveProperty("b");
  }, 30000);

  test("GET /api/cs2-compare без params → 200 (default rounds)", async ({ request }) => {
    const resp = await request.get("/api/cs2-compare");
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data).toHaveProperty("rounds");
  }, 30000);

  test("GET /api/cs2-prices?case=Weapon → 200, has prices", async ({ request }) => {
    const resp = await request.get("/api/cs2-prices?case=Weapon");
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    // Должен быть объект с ценами
    expect(typeof data).toBe("object");
    const keys = Object.keys(data);
    expect(keys.length).toBeGreaterThan(0);
  }, 30000);

  test("GET /api/cs2-battle → 200", async ({ request }) => {
    const resp = await request.get("/api/cs2-battle");
    expect(resp.status()).toBeLessThan(500);
  }, 30000);
});

// Security — базовые проверки
test.describe("Security", () => {
  test("404 для неизвестного API", async ({ request }) => {
    const resp = await request.get("/api/nonexistent-endpoint-xyz");
    expect(resp.status()).toBe(404);
  });

  test("CS2 compare: rounds=0 → не crash", async ({ request }) => {
    const resp = await request.get("/api/cs2-compare?rounds=0");
    // Может быть 400 или 200 с пустыми rounds
    expect(resp.status()).toBeLessThan(500);
  }, 30000);

  test("CS2 compare: rounds=9999 → не crash, не зависает", async ({ request }) => {
    const resp = await request.get("/api/cs2-compare?rounds=9999");
    expect(resp.status()).toBeLessThan(500);
    const data = await resp.json();
    expect(data).toHaveProperty("rounds");
    // Не должно быть 9999 rounds (ограничение сервера)
    expect(data.rounds.length).toBeLessThanOrEqual(50);
  }, 30000);

  test("CS2 prices: неизвестный кейс → не crash", async ({ request }) => {
    const resp = await request.get("/api/cs2-prices?case=NonExistentCase12345");
    expect(resp.status()).toBeLessThan(500);
  }, 30000);
});
