// ============================================================
// useLiveKitVoice — голосовой чат для комнат «Своей игры»
// ============================================================
// Архитектура:
//   - Один Room-объект на вкладку (ref) — переживает повторные рендеры
//   - Токен запрашивается у /api/livekit-token (серверная валидация)
//   - При выходе из комнаты / unmount → disconnect
//   - При потере сети → LiveKit сам reconnect (state: Reconnecting)
//   - Микрофон включается ТОЛЬКО по явному действию пользователя
// ============================================================

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  ConnectionState,
  type Participant,
} from "livekit-client";

export interface VoiceParticipant {
  id: string;
  name: string;
  isSelf: boolean;
  micEnabled: boolean;
  speaking: boolean;
}

export type VoiceStatus =
  | "idle"       // не подключён
  | "connecting" // идёт подключение
  | "connected"  // в комнате
  | "reconnecting"
  | "error";

export interface VoiceError {
  code: string;
  message: string;
  canRetry: boolean;
}

export function useLiveKitVoice(
  roomId: string | null,
  playerId: string,
  playerName: string
) {
  // ---------- refs ----------
  const roomRef = useRef<Room | null>(null);
  const connectingRef = useRef(false);
  const destroyedRef = useRef(false);
  const lastErrorRef = useRef<VoiceError | null>(null);

  // ---------- state ----------
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [micEnabled, setMicEnabled] = useState(false);
  const [error, setError] = useState<VoiceError | null>(null);

  // ---------- Обновление списка участников ----------
  const refreshParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;

    const list: VoiceParticipant[] = [];

    // Локальный участник
    const lp = room.localParticipant;
    if (lp) {
      list.push({
        id: lp.identity,
        name: lp.name || playerName || "Вы",
        isSelf: true,
        micEnabled: lp.isMicrophoneEnabled,
        speaking: lp.isSpeaking,
      });
    }

    // Удалённые участники
    room.remoteParticipants.forEach((rp: Participant) => {
      list.push({
        id: rp.identity,
        name: rp.name || "Участник",
        isSelf: false,
        micEnabled: rp.isMicrophoneEnabled,
        speaking: rp.isSpeaking,
      });
    });

    // Сортировка: свой участник первым, остальные по имени
    list.sort((a, b) => {
      if (a.isSelf && !b.isSelf) return -1;
      if (!a.isSelf && b.isSelf) return 1;
      return a.name.localeCompare(b.name, "ru");
    });

    setParticipants(list);
  }, [playerName]);

  // ---------- Очистка ----------
  const cleanup = useCallback(async () => {
    connectingRef.current = false;
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      try {
        await room.disconnect();
      } catch {
        // ignore
      }
    }
    setStatus("idle");
    setParticipants([]);
    setMicEnabled(false);
  }, []);

  // ---------- Получить токен ----------
  const fetchToken = useCallback(
    async (): Promise<{ token: string; url: string; roomName: string } | null> => {
      try {
        const res = await fetch("/api/livekit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, playerId }),
        });
        const data = await res.json();
        if (!res.ok) {
          const msg = data.error ?? "Ошибка выдачи токена";
          if (res.status === 503) {
            return null; // LiveKit не настроен — не показываем ошибку пользователю
          }
          throw new Error(`${msg} (HTTP ${res.status})`);
        }
        return { token: data.token, url: data.url, roomName: data.room };
      } catch (e) {
        throw e as Error;
      }
    },
    [roomId, playerId]
  );

  // ---------- Переключатель звука (глобальный mute удалённых треков) ----------
  // soundOn=true → звук включён (mute=false), soundOn=false → звук выключен (mute=true)
  const [soundOn, setSoundOn] = useState(true);
  const soundOnRef = useRef(true);

  /** Применить текущее состояние звука ко всем удалённым аудио-трекам. */
  const applySoundMute = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const mute = !soundOnRef.current;
    room.remoteParticipants.forEach((rp) => {
      rp.trackPublications.forEach((pub) => {
        if (pub.kind === "audio" && pub.track) {
          (pub.track as { setMuted?: (m: boolean) => void }).setMuted?.(mute);
        }
      });
    });
  }, []);

  const toggleSound = useCallback(() => {
    const newOn = !soundOnRef.current;
    soundOnRef.current = newOn;
    setSoundOn(newOn);
    applySoundMute();
  }, [applySoundMute]);

  // ---------- Подключиться к голосовой комнате ----------
  const connect = useCallback(async () => {
    if (!roomId || connectingRef.current || roomRef.current) return;
    connectingRef.current = true;
    setStatus("connecting");
    setError(null);

    try {
      // Получить токен
      const cred = await fetchToken();
      if (!cred) {
        // LiveKit не настроен — тихо выходим в idle
        setStatus("idle");
        return;
      }

      // Создаём Room (один на вкладку)
      const room = new Room({ dynacast: true });
      roomRef.current = room;

      // Слушатели событий
      const onConnectionState = (state: ConnectionState) => {
        if (destroyedRef.current) return;
        if (state === ConnectionState.Connected) {
          setStatus("connected");
          lastErrorRef.current = null;
          refreshParticipants();
          applySoundMute();
        } else if (state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting) {
          setStatus("reconnecting");
        } else if (state === ConnectionState.Disconnected) {
          // LiveKit отключился — если мы не инициировали disconnect
          if (!destroyedRef.current && roomRef.current === room) {
            setStatus("idle");
          }
        } else if (state === ConnectionState.Connecting) {
          setStatus("connecting");
        }
      };

      const onParticipantConnected = () => {
        refreshParticipants();
        // Применяем текущее состояние звука к новому участнику
        applySoundMute();
      };
      const onParticipantDisconnected = () => refreshParticipants();
      const onActiveSpeakers = () => refreshParticipants();
      const onLocalTrackPublished = () => refreshParticipants();
      const onLocalTrackUnpublished = () => refreshParticipants();
      const onParticipantNameChanged = () => refreshParticipants();
      const onDisconnected = () => {
        if (destroyedRef.current) return;
        if (roomRef.current === room) {
          setStatus("idle");
        }
      };
      const onError = (e: unknown) => {
        if (destroyedRef.current) return;
        const err = e as Error;
        const msg = err?.message ?? "Неизвестная ошибка";
        let code = "error";
        let canRetry = true;
        if (/microphone|audio|device|getUserMedia|not-allowed|NotAllowed/i.test(msg)) {
          code = "mic-denied";
          canRetry = true;
        } else if (/network|fetch|timeout|ECONNREFUSED/i.test(msg)) {
          code = "network";
          canRetry = true;
        } else if (/not configured|503/i.test(msg)) {
          code = "not-configured";
          canRetry = false;
        }
        const voiceError: VoiceError = { code, message: msg, canRetry };
        lastErrorRef.current = voiceError;
        setError(voiceError);
        setStatus("error");
      };

      room.on(RoomEvent.ConnectionStateChanged, onConnectionState);
      room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
      room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
      room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakers);
      room.on(RoomEvent.LocalTrackPublished, onLocalTrackPublished);
      room.on(RoomEvent.LocalTrackUnpublished, onLocalTrackUnpublished);
      room.on(RoomEvent.ParticipantNameChanged, onParticipantNameChanged);
      room.on(RoomEvent.Disconnected, onDisconnected);
      room.on(RoomEvent.MediaDevicesError, onError);

      // Подключение
      await room.connect(cred.url, cred.token);

      // Включаем микрофон (только после подключения, по явному намерению пользователя)
      // Но НЕ автоматически — микрофон включается кнопкой
      // room.setMicrophoneEnabled(true) — вызывается из toggleMic()

      refreshParticipants();
    } catch (e) {
      if (destroyedRef.current) return;
      const err = e as Error;
      let code = "error";
      let canRetry = true;
      if (/microphone|audio|device|getUserMedia|not-allowed|NotAllowed/i.test(err.message)) {
        code = "mic-denied";
      } else if (/network|fetch|timeout/i.test(err.message)) {
        code = "network";
      } else if (/token|401|403/i.test(err.message)) {
        code = "auth";
        canRetry = false;
      }
      setError({ code, message: err.message, canRetry });
      setStatus("error");
      // Убираем сломанный room
      if (roomRef.current) {
        try { await roomRef.current.disconnect(); } catch { /* ignore */ }
        roomRef.current = null;
      }
    } finally {
      connectingRef.current = false;
    }
  }, [roomId, playerName, fetchToken, refreshParticipants, applySoundMute]);

  // ---------- Отключиться ----------
  const disconnect = useCallback(async () => {
    connectingRef.current = false;
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      try {
        await room.disconnect();
      } catch {
        // ignore
      }
    }
    setStatus("idle");
    setParticipants([]);
    setMicEnabled(false);
    setError(null);
  }, []);

  // ---------- Микрофон ----------
  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    const newEnabled = !room.localParticipant.isMicrophoneEnabled;
    try {
      await room.localParticipant.setMicrophoneEnabled(newEnabled);
      setMicEnabled(newEnabled);
      setError(null);
    } catch (e) {
      const err = e as Error;
      let code = "mic-error";
      let message = "Не удалось включить микрофон";
      if (/NotAllowedError|NotAllowed/i.test(err.message)) {
        code = "mic-denied";
        message = "Доступ к микрофону запрещён. Разрешите доступ в настройках браузера и попробуйте снова.";
      } else if (/NotFoundError|DevicesNotFound/i.test(err.message)) {
        code = "mic-not-found";
        message = "Микрофон не найден. Подключите устройство и попробуйте снова.";
      }
      setError({ code, message, canRetry: true });
    }
  }, []);

  // ---------- Unmount cleanup ----------
  useEffect(() => {
    destroyedRef.current = false;
    return () => {
      destroyedRef.current = true;
      const room = roomRef.current;
      roomRef.current = null;
      if (room) {
        // disconnect без await (unmount)
        void room.disconnect().catch(() => {});
      }
    };
  }, []);

  return {
    status,
    participants,
    micEnabled,
    soundOn,
    error,
    connect,
    disconnect,
    toggleMic,
    toggleSound,
    retry: () => {
      setError(null);
      void connect();
    },
  };
}
