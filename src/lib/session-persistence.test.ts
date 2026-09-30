// ============================================================
// SESSION PERSISTENCE TESTS — восстановление незавершённых партий
//
// Проверяет:
//   1. GeoGuessr CLASSIC — сохранение/восстановление/очистка
//   2. Akinator — сохранение/восстановление/очистка
//   3. Quiz — сохранение кода комнаты/восстановление/очистка
//   4. Повреждённые данные → безопасная очистка
//   5. Версионирование — устаревшие версии не читаются
// ============================================================
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Mock localStorage ----------
function makeLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", makeLocalStorage());
  // Локальные импорты модулей сбрасываются — vitest cache-bust
  vi.resetModules();
});

// ============================================================
// GEOGUESSR CLASSIC SESSION
// ============================================================
describe("GeoGuessr Classic — session persistence", () => {
  async function loadModule() {
    return await import("../games/geoguessr/geo-classic-session");
  }

  it("saveSession → loadSession возвращает те же данные", async () => {
    const mod = await loadModule();
    const { LOCATIONS } = await import("../games/geoguessr/locations");
    // Берём реальные id из LOCATIONS для валидации
    const realLoc = LOCATIONS[0];
    const realLoc2 = LOCATIONS[1] ?? LOCATIONS[0];
    const session = {
      version: 1 as const,
      round: 2,
      currentId: realLoc.id,
      usedIds: [realLoc2.id],
      history: [
        {
          location: realLoc2,
          guess: { latitude: realLoc2.latitude, longitude: realLoc2.longitude },
          distanceKm: 10,
          points: 5000,
        },
      ],
      phase: "playing" as const,
      roundResult: null,
      savedAt: 1234567890,
    };
    mod.saveSession(session);
    const loaded = mod.loadSession();
    expect(loaded).not.toBeNull();
    expect(loaded!.round).toBe(2);
    expect(loaded!.currentId).toBe(realLoc.id);
    expect(loaded!.usedIds).toEqual([realLoc2.id]);
    expect(loaded!.history.length).toBe(1);
    expect(loaded!.history[0].points).toBe(5000);
    expect(loaded!.phase).toBe("playing");
    expect(loaded!.roundResult).toBeNull();
  });

  it("phase=revealed: history.length === round → валидно", async () => {
    const mod = await loadModule();
    const { LOCATIONS } = await import("../games/geoguessr/locations");
    const realLoc = LOCATIONS[0];
    const realLoc2 = LOCATIONS[1] ?? LOCATIONS[0];
    const session = {
      version: 1 as const,
      round: 2,
      currentId: realLoc.id,
      usedIds: [realLoc2.id],
      history: [
        {
          location: realLoc2,
          guess: { latitude: realLoc2.latitude, longitude: realLoc2.longitude },
          distanceKm: 10,
          points: 5000,
        },
        {
          location: realLoc,
          guess: { latitude: realLoc.latitude, longitude: realLoc.longitude },
          distanceKm: 20,
          points: 4500,
        },
      ],
      phase: "revealed" as const,
      roundResult: {
        location: realLoc,
        guess: { latitude: realLoc.latitude, longitude: realLoc.longitude },
        distanceKm: 20,
        points: 4500,
      },
      savedAt: 1234567890,
    };
    mod.saveSession(session);
    const loaded = mod.loadSession();
    expect(loaded).not.toBeNull();
    expect(loaded!.phase).toBe("revealed");
    expect(loaded!.history.length).toBe(2); // === round
    expect(loaded!.roundResult).not.toBeNull();
  });

  it("phase=playing: history.length === round → НЕ валидно (ожидается round-1)", async () => {
    const mod = await loadModule();
    const { LOCATIONS } = await import("../games/geoguessr/locations");
    const realLoc = LOCATIONS[0];
    const realLoc2 = LOCATIONS[1] ?? LOCATIONS[0];
    const bad = {
      version: 1,
      round: 2,
      currentId: realLoc.id,
      usedIds: [realLoc2.id],
      history: [
        {
          location: realLoc2,
          guess: { latitude: realLoc2.latitude, longitude: realLoc2.longitude },
          distanceKm: 10,
          points: 5000,
        },
        {
          location: realLoc,
          guess: { latitude: realLoc.latitude, longitude: realLoc.longitude },
          distanceKm: 20,
          points: 4500,
        },
      ],
      phase: "playing", // round=2, но history.length=2 (ожидается 1)
      roundResult: null,
      savedAt: 0,
    };
    localStorage.setItem("geoguessr-lite-session-v1", JSON.stringify(bad));
    expect(mod.loadSession()).toBeNull();
  });

  it("loadSession без сохранения → null", async () => {
    const mod = await loadModule();
    expect(mod.loadSession()).toBeNull();
  });

  it("clearSession удаляет сохранение", async () => {
    const mod = await loadModule();
    const { LOCATIONS } = await import("../games/geoguessr/locations");
    mod.saveSession({
      version: 1,
      round: 1,
      currentId: LOCATIONS[0].id,
      usedIds: [],
      history: [],
      phase: "playing",
      roundResult: null,
      savedAt: Date.now(),
    });
    expect(mod.loadSession()).not.toBeNull();
    mod.clearSession();
    expect(mod.loadSession()).toBeNull();
  });

  it("Повреждённый JSON → null + очистка", async () => {
    const mod = await loadModule();
    localStorage.setItem("geoguessr-lite-session-v1", "{not valid json");
    expect(mod.loadSession()).toBeNull();
    expect(localStorage.getItem("geoguessr-lite-session-v1")).toBeNull();
  });

  it("Устаревшая версия (version: 2) → null + очистка", async () => {
    const mod = await loadModule();
    const bad = { version: 2, round: 1, currentId: "london", usedIds: [], history: [], phase: "playing", roundResult: null, savedAt: 0 };
    localStorage.setItem("geoguessr-lite-session-v1", JSON.stringify(bad));
    expect(mod.loadSession()).toBeNull();
    expect(localStorage.getItem("geoguessr-lite-session-v1")).toBeNull();
  });

  it("Невалидный round (0) → null + очистка", async () => {
    const mod = await loadModule();
    const bad = { version: 1, round: 0, currentId: "london", usedIds: [], history: [], phase: "playing", roundResult: null, savedAt: 0 };
    localStorage.setItem("geoguessr-lite-session-v1", JSON.stringify(bad));
    expect(mod.loadSession()).toBeNull();
  });

  it("history.length != round-1 → null + очистка", async () => {
    const mod = await loadModule();
    const bad = {
      version: 1, round: 3, currentId: "london", usedIds: ["paris", "tokyo"],
      history: [
        {
          location: { id: "paris", image: "/p.jpg", latitude: 48, longitude: 2, country: "France", city: "Paris", description: "d" },
          guess: { latitude: 49, longitude: 3 },
          distanceKm: 150,
          points: 2000,
        },
      ],
      phase: "playing", roundResult: null, savedAt: 0,
    };
    localStorage.setItem("geoguessr-lite-session-v1", JSON.stringify(bad));
    expect(mod.loadSession()).toBeNull();
  });

  it("Невалидный currentId (нет в LOCATIONS) → null + очистка", async () => {
    const mod = await loadModule();
    const bad = { version: 1, round: 1, currentId: "nonexistent-location-xyz", usedIds: [], history: [], phase: "playing", roundResult: null, savedAt: 0 };
    localStorage.setItem("geoguessr-lite-session-v1", JSON.stringify(bad));
    expect(mod.loadSession()).toBeNull();
    expect(localStorage.getItem("geoguessr-lite-session-v1")).toBeNull();
  });
});

// ============================================================
// AKINATOR SESSION
// ============================================================
describe("Akinator — session persistence", () => {
  async function loadModule() {
    return await import("../games/akinator/akinator-session");
  }

  const fakeState = {
    candidates: ["entity1", "entity2"],
    weights: { entity1: 1.5, entity2: 0.8 },
    asked: ["q1", "q2"],
    questionNum: 2,
    phase: "playing" as const,
    wrongGuesses: 0,
    hardAnswers: { q1: "yes" as const },
  };

  it("saveSession → loadSession возвращает EngineState", async () => {
    const mod = await loadModule();
    mod.saveSession(fakeState, true);
    const loaded = mod.loadSession();
    expect(loaded).not.toBeNull();
    expect(loaded!.state.candidates).toEqual(["entity1", "entity2"]);
    expect(loaded!.state.weights.entity1).toBe(1.5);
    expect(loaded!.state.questionNum).toBe(2);
    expect(loaded!.state.hardAnswers.q1).toBe("yes");
    expect(loaded!.started).toBe(true);
  });

  it("Завершённая партия (phase=won) → loadSession возвращает null", async () => {
    const mod = await loadModule();
    const wonState = { ...fakeState, phase: "won" as const };
    mod.saveSession(wonState, true);
    expect(mod.loadSession()).toBeNull();
    // saveSession для завершённой партии вызывает clearSession
    expect(localStorage.getItem("fd_akinator_session_v1")).toBeNull();
  });

  it("phase=lost → null", async () => {
    const mod = await loadModule();
    const lostState = { ...fakeState, phase: "lost" as const };
    mod.saveSession(lostState, true);
    expect(mod.loadSession()).toBeNull();
  });

  it("phase=surrender → null", async () => {
    const mod = await loadModule();
    const surrenderState = { ...fakeState, phase: "surrender" as const };
    mod.saveSession(surrenderState, true);
    expect(mod.loadSession()).toBeNull();
  });

  it("loadSession без сохранения → null", async () => {
    const mod = await loadModule();
    expect(mod.loadSession()).toBeNull();
  });

  it("clearSession удаляет", async () => {
    const mod = await loadModule();
    mod.saveSession(fakeState, true);
    expect(mod.loadSession()).not.toBeNull();
    mod.clearSession();
    expect(mod.loadSession()).toBeNull();
  });

  it("Повреждённый JSON → null + очистка", async () => {
    const mod = await loadModule();
    localStorage.setItem("fd_akinator_session_v1", "{broken");
    expect(mod.loadSession()).toBeNull();
    expect(localStorage.getItem("fd_akinator_session_v1")).toBeNull();
  });

  it("Устаревшая версия → null + очистка", async () => {
    const mod = await loadModule();
    const bad = { version: 99, state: fakeState, started: true, savedAt: 0 };
    localStorage.setItem("fd_akinator_session_v1", JSON.stringify(bad));
    expect(mod.loadSession()).toBeNull();
    expect(localStorage.getItem("fd_akinator_session_v1")).toBeNull();
  });
});

// ============================================================
// QUIZ SESSION
// ============================================================
describe("Quiz — session persistence", () => {
  async function loadModule() {
    return await import("../components/quiz-session");
  }

  it("saveSession → loadSession возвращает код + playerId", async () => {
    const mod = await loadModule();
    mod.saveSession("abc12", "p12345");
    const loaded = mod.loadSession();
    expect(loaded).not.toBeNull();
    expect(loaded!.code).toBe("ABC12"); // upper-case
    expect(loaded!.playerId).toBe("p12345");
    expect(loaded!.role).toBe("guest"); // default
  });

  it("saveSession с ролью host", async () => {
    const mod = await loadModule();
    mod.saveSession("XYZ99", "p99999", "host");
    const loaded = mod.loadSession();
    expect(loaded).not.toBeNull();
    expect(loaded!.role).toBe("host");
  });

  it("loadSession без сохранения → null", async () => {
    const mod = await loadModule();
    expect(mod.loadSession()).toBeNull();
  });

  it("clearSession удаляет", async () => {
    const mod = await loadModule();
    mod.saveSession("xyz99", "p11111");
    expect(mod.loadSession()).not.toBeNull();
    mod.clearSession();
    expect(mod.loadSession()).toBeNull();
  });

  it("Короткий код (< 4) → null + очистка", async () => {
    const mod = await loadModule();
    const bad = { version: 1, code: "AB", playerId: "p1", savedAt: 0 };
    localStorage.setItem("quiz-online-room-code-v1", JSON.stringify(bad));
    expect(mod.loadSession()).toBeNull();
    expect(localStorage.getItem("quiz-online-room-code-v1")).toBeNull();
  });

  it("Устаревшая версия → null + очистка", async () => {
    const mod = await loadModule();
    const bad = { version: 0, code: "ABC12", playerId: "p1", savedAt: 0 };
    localStorage.setItem("quiz-online-room-code-v1", JSON.stringify(bad));
    expect(mod.loadSession()).toBeNull();
    expect(localStorage.getItem("quiz-online-room-code-v1")).toBeNull();
  });

  it("Нет playerId → null + очистка", async () => {
    const mod = await loadModule();
    const bad = { version: 1, code: "ABC12", savedAt: 0 };
    localStorage.setItem("quiz-online-room-code-v1", JSON.stringify(bad));
    expect(mod.loadSession()).toBeNull();
    expect(localStorage.getItem("quiz-online-room-code-v1")).toBeNull();
  });

  it("Невалидная роль → null + очистка", async () => {
    const mod = await loadModule();
    const bad = { version: 1, code: "ABC12", playerId: "p1", role: "admin", savedAt: 0 };
    localStorage.setItem("quiz-online-room-code-v1", JSON.stringify(bad));
    expect(mod.loadSession()).toBeNull();
    expect(localStorage.getItem("quiz-online-room-code-v1")).toBeNull();
  });

  it("Повреждённый JSON → null + очистка", async () => {
    const mod = await loadModule();
    localStorage.setItem("quiz-online-room-code-v1", "corrupt");
    expect(mod.loadSession()).toBeNull();
    expect(localStorage.getItem("quiz-online-room-code-v1")).toBeNull();
  });
});
