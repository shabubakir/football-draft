// ============================================================
// /api/livekit-token — тесты API-роута
// ============================================================
// Проверяем:
//   1. 503 когда LiveKit не настроен
//   2. 400 при пустых параметрах
//   3. 403 для постороннего (не участник комнаты)
//   4. 404 когда комната не найдена
//   5. 200 + token когда всё ок
//   6. Секреты не логируются
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ---------- Hoisted mocks (видимы внутри vi.mock factory) ----------
const mocks = vi.hoisted(() => ({
  isConfigured: false,
  verifyResult: { ok: false as boolean, error: "", status: 400 } as { ok: boolean; error?: string; status: number; name?: string },
  toJwt: async () => "fake-jwt-token",
  addGrant: () => {},
}));

vi.mock("@/lib/livekit", () => ({
  isLiveKitConfigured: () => mocks.isConfigured,
  verifyRoomMembership: async () => mocks.verifyResult,
}));

vi.mock("livekit-server-sdk", () => ({
  AccessToken: vi.fn().mockImplementation(() => ({
    addGrant: mocks.addGrant,
    toJwt: mocks.toJwt,
  })),
}));

import { POST } from "./route";

/** Создать NextRequest с JSON body. */
function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/livekit-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/livekit-token", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
    process.env.LIVEKIT_URL = "https://test.livekit.cloud";
    process.env.LIVEKIT_API_KEY = "test-key";
    process.env.LIVEKIT_API_SECRET = "test-secret";
    mocks.isConfigured = true;
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it("503: LiveKit не настроен", async () => {
    mocks.isConfigured = false;
    const res = await POST(makeRequest({ roomId: "r1", playerId: "p1" }));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain("не настроен");
  });

  it("400: пустые roomId/playerId", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("403: посторонний пользователь", async () => {
    mocks.verifyResult = {
      ok: false,
      error: "Вы не участник этой комнаты",
      status: 403,
    };
    const res = await POST(makeRequest({ roomId: "r1", playerId: "stranger" }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Вы не участник этой комнаты");
  });

  it("404: комната не найдена", async () => {
    mocks.verifyResult = {
      ok: false,
      error: "Комната не найдена",
      status: 404,
    };
    const res = await POST(makeRequest({ roomId: "nonexistent", playerId: "p1" }));
    expect(res.status).toBe(404);
  });

  it("200: успешная выдача токена", async () => {
    mocks.verifyResult = {
      ok: true,
      name: "Test User",
      status: 200,
    };
    const res = await POST(makeRequest({ roomId: "r1", playerId: "p1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBe("fake-jwt-token");
    expect(data.url).toBe("https://test.livekit.cloud");
    expect(data.room).toBe("svoya-r1");
  });

  it("секреты не логируются", async () => {
    mocks.verifyResult = {
      ok: true,
      name: "Test User",
      status: 200,
    };
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await POST(makeRequest({ roomId: "r1", playerId: "p1" }));
    for (const call of logSpy.mock.calls) {
      const msg = String(call[0]);
      expect(msg).not.toContain("test-secret");
      expect(msg).not.toContain("test-key");
    }
    logSpy.mockRestore();
  });
});
