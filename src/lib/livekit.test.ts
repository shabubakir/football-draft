// ============================================================
// LiveKit — тесты серверной валидации
// ============================================================
// Проверяем:
//   1. isLiveKitConfigured: 3 переменные окружения
//   2. verifyRoomMembership: валидация членства в комнате
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyRoomMembership, isLiveKitConfigured } from "@/lib/livekit";

// ---------- Mock getSupabaseServer ----------
vi.mock("@/lib/supabase", () => ({
  getSupabaseServer: vi.fn(),
}));

import { getSupabaseServer } from "@/lib/supabase";

/**
 * Создать мок Supabase-клиента с корректной цепочкой:
 *   sb.from(table).select("*").eq("id", x).maybeSingle()
 */
function makeMockSb(players: { id: string; name: string }[], overrides?: {
  data?: unknown;
  error?: unknown;
}) {
  const maybeSingle = vi.fn().mockResolvedValue(
    overrides ?? { data: { state: { players } }, error: null }
  );
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { from };
}

describe("isLiveKitConfigured", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
    delete process.env.LIVEKIT_URL;
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it("false когда нет переменных", () => {
    expect(isLiveKitConfigured()).toBe(false);
  });

  it("true когда все три заданы", () => {
    process.env.LIVEKIT_URL = "https://test.livekit.cloud";
    process.env.LIVEKIT_API_KEY = "key";
    process.env.LIVEKIT_API_SECRET = "secret";
    expect(isLiveKitConfigured()).toBe(true);
  });

  it("false когда нет LIVEKIT_URL", () => {
    process.env.LIVEKIT_API_KEY = "key";
    process.env.LIVEKIT_API_SECRET = "secret";
    expect(isLiveKitConfigured()).toBe(false);
  });

  it("false когда нет LIVEKIT_API_SECRET", () => {
    process.env.LIVEKIT_URL = "https://test.livekit.cloud";
    process.env.LIVEKIT_API_KEY = "key";
    expect(isLiveKitConfigured()).toBe(false);
  });
});

describe("verifyRoomMembership", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  afterEach(() => {
    process.env = origEnv;
    vi.restoreAllMocks();
  });

  it("400: пустые roomId/playerId", async () => {
    (getSupabaseServer as ReturnType<typeof vi.fn>).mockReturnValue(makeMockSb([]));
    const result = await verifyRoomMembership("", "");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("503: Supabase не настроен", async () => {
    (getSupabaseServer as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const result = await verifyRoomMembership("room1", "player1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });

  it("404: комната не найдена", async () => {
    const mockSb = makeMockSb([], { data: null, error: null });
    (getSupabaseServer as ReturnType<typeof vi.fn>).mockReturnValue(mockSb);
    const result = await verifyRoomMembership("room1", "player1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("403: игрок не в комнате", async () => {
    const players = [{ id: "other-player", name: "Other" }];
    const mockSb = makeMockSb(players);
    (getSupabaseServer as ReturnType<typeof vi.fn>).mockReturnValue(mockSb);
    const result = await verifyRoomMembership("room1", "player1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("200: игрок в комнате → имя игрока", async () => {
    const players = [
      { id: "player1", name: "Test User" },
      { id: "player2", name: "Other" },
    ];
    const mockSb = makeMockSb(players);
    (getSupabaseServer as ReturnType<typeof vi.fn>).mockReturnValue(mockSb);
    const result = await verifyRoomMembership("room1", "player1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.name).toBe("Test User");
    }
  });

  it("500: ошибка Supabase", async () => {
    const mockSb = makeMockSb([], {
      data: null,
      error: { message: "connection refused" },
    });
    (getSupabaseServer as ReturnType<typeof vi.fn>).mockReturnValue(mockSb);
    const result = await verifyRoomMembership("room1", "player1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(500);
  });
});
