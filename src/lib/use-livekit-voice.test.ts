// ============================================================
// useLiveKitVoice — тесты хука голосового чата
// ============================================================
// Функциональные тесты через @testing-library/react renderHook.
//
// Тесты, НЕ требующие сети (fetch/LiveKit):
//   1. Начальное состояние: idle
//   2. toggleSound() переключает soundOn
//   3. roomId=null → idle
//   4. error: mic-denied при отказе в доступе
//   5. toggleMic() переключает micEnabled
//
// Тесты, требующие сети (connect/disconnect/error codes),
// покрыты интеграционными тестами в route.test.ts и
// ручным тестом (2 вкладки → голосовой чат).
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ---------- Hoisted mocks ----------
const mocks = vi.hoisted(() => {
  const connectionState = {
    Disconnected: "disconnected",
    Connecting: "connecting",
    Connected: "connected",
    Reconnecting: "reconnecting",
    SignalReconnecting: "signalReconnecting",
  };
  const roomEvent = {
    ConnectionStateChanged: "connectionStateChanged",
    ParticipantConnected: "participantConnected",
    ParticipantDisconnected: "participantDisconnected",
    ActiveSpeakersChanged: "activeSpeakersChanged",
    LocalTrackPublished: "localTrackPublished",
    LocalTrackUnpublished: "localTrackUnpublished",
    ParticipantNameChanged: "participantNameChanged",
    Disconnected: "disconnected",
    MediaDevicesError: "mediaDevicesError",
  };
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    setMicrophoneEnabled: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    connectionState,
    roomEvent,
    micEnabled: false,
    fetchMock: vi.fn(),
  };
});

vi.mock("livekit-client", () => ({
  Room: vi.fn().mockImplementation(() => ({
    state: mocks.connectionState.Disconnected,
    name: "",
    remoteParticipants: new Map(),
    localParticipant: {
      identity: "test-player",
      name: "Test",
      get isMicrophoneEnabled() {
        return mocks.micEnabled;
      },
      isSpeaking: false,
      setMicrophoneEnabled: mocks.setMicrophoneEnabled,
    },
    connect: mocks.connect,
    disconnect: mocks.disconnect,
    on: mocks.on,
    off: mocks.off,
  })),
  RoomEvent: mocks.roomEvent,
  ConnectionState: mocks.connectionState,
}));

// Mock fetch GLOBALLY (до импорта хука)
vi.stubGlobal("fetch", mocks.fetchMock);

import { useLiveKitVoice } from "./use-livekit-voice";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.micEnabled = false;
  mocks.setMicrophoneEnabled.mockResolvedValue(undefined);
  // Re-stub fetch (unstubAllGlobals removes it in afterEach)
  vi.stubGlobal("fetch", mocks.fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useLiveKitVoice", () => {
  it("начальное состояние: idle, пустые participants", () => {
    const { result } = renderHook(() =>
      useLiveKitVoice("test-room", "player1", "Test")
    );
    expect(result.current.status).toBe("idle");
    expect(result.current.participants).toHaveLength(0);
    expect(result.current.micEnabled).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.soundOn).toBe(true);
  });

  it("toggleSound() переключает soundOn", () => {
    const { result } = renderHook(() =>
      useLiveKitVoice("test-room", "player1", "Test")
    );

    expect(result.current.soundOn).toBe(true);

    act(() => {
      result.current.toggleSound();
    });
    expect(result.current.soundOn).toBe(false);

    act(() => {
      result.current.toggleSound();
    });
    expect(result.current.soundOn).toBe(true);
  });

  it("roomId=null → idle", () => {
    const { result } = renderHook(() =>
      useLiveKitVoice(null, "player1", "Test")
    );
    expect(result.current.status).toBe("idle");
  });

  it("connect() → Room.connect вызывается", async () => {
    // Мокаем fetch для токена
    mocks.fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          token: "test-token",
          url: "https://test.livekit.cloud",
          room: "svoya-test-room",
        }),
    });

    const { result } = renderHook(() =>
      useLiveKitVoice("test-room", "player1", "Test")
    );

    await act(async () => {
      await result.current.connect();
    });

    // Room.connect должен быть вызван
    expect(mocks.connect).toHaveBeenCalled();
  });

  it("disconnect() → idle, participants очищены", async () => {
    mocks.fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          token: "test-token",
          url: "https://test.livekit.cloud",
          room: "svoya-test-room",
        }),
    });

    const { result } = renderHook(() =>
      useLiveKitVoice("test-room", "player1", "Test")
    );

    await act(async () => {
      await result.current.connect();
    });

    await act(async () => {
      await result.current.disconnect();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.participants).toHaveLength(0);
  });

  it("нет дублирования при повторном connect", async () => {
    mocks.fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          token: "test-token",
          url: "https://test.livekit.cloud",
          room: "svoya-test-room",
        }),
    });

    const { result } = renderHook(() =>
      useLiveKitVoice("test-room", "player1", "Test")
    );

    await act(async () => {
      await result.current.connect();
    });

    const callCount = mocks.connect.mock.calls.length;
    expect(callCount).toBe(1);

    // Повторный connect — должен быть проигнорирован
    await act(async () => {
      await result.current.connect();
    });

    expect(mocks.connect.mock.calls.length).toBe(callCount);
  });

  it("toggleMic() → setMicrophoneEnabled вызывается", async () => {
    mocks.fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          token: "test-token",
          url: "https://test.livekit.cloud",
          room: "svoya-test-room",
        }),
    });

    const { result } = renderHook(() =>
      useLiveKitVoice("test-room", "player1", "Test")
    );

    await act(async () => {
      await result.current.connect();
    });

    // Имитируем что микрофон включился
    mocks.setMicrophoneEnabled.mockImplementation(async (enabled: boolean) => {
      mocks.micEnabled = enabled;
    });

    await act(async () => {
      await result.current.toggleMic();
    });

    expect(mocks.setMicrophoneEnabled).toHaveBeenCalledWith(true);
    expect(result.current.micEnabled).toBe(true);
  });

  it("error: mic-denied при отказе в доступе", async () => {
    mocks.fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          token: "test-token",
          url: "https://test.livekit.cloud",
          room: "svoya-test-room",
        }),
    });

    const { result } = renderHook(() =>
      useLiveKitVoice("test-room", "player1", "Test")
    );

    await act(async () => {
      await result.current.connect();
    });

    mocks.setMicrophoneEnabled.mockRejectedValueOnce(
      new Error("NotAllowedError: Permission denied")
    );

    await act(async () => {
      await result.current.toggleMic();
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.code).toBe("mic-denied");
  });

  it("503 от API → тихо idle", async () => {
    mocks.fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ error: "LiveKit не настроен" }),
    });

    const { result } = renderHook(() =>
      useLiveKitVoice("test-room", "player1", "Test")
    );

    await act(async () => {
      await result.current.connect();
    });

    // 503 → тихо idle, без ошибки
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("403 от API → error", async () => {
    mocks.fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: "Вы не участник" }),
    });

    const { result } = renderHook(() =>
      useLiveKitVoice("test-room", "stranger", "Stranger")
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).not.toBeNull();
  });

  it("network error → error", async () => {
    mocks.fetchMock.mockRejectedValue(new Error("NetworkError: fetch failed"));

    const { result } = renderHook(() =>
      useLiveKitVoice("test-room", "player1", "Test")
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).not.toBeNull();
  });
});
