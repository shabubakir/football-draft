// ============================================================
// VoiceChatPanel — компактная панель голосового чата
// ============================================================
// Показывается в лобби, на доске, на вопросе и в финале.
// Кнопки: Подключить / Микрофон / Звук / Выйти из голоса
// ============================================================

"use client";

import {
  useLiveKitVoice,
  type VoiceParticipant,
  type VoiceStatus,
  type VoiceError,
} from "@/lib/use-livekit-voice";

function statusLabel(s: VoiceStatus): { text: string; cls: string } {
  switch (s) {
    case "idle":
      return { text: "Не подключён", cls: "text-white/30" };
    case "connecting":
      return { text: "Подключение…", cls: "text-amber-300" };
    case "connected":
      return { text: "Подключён", cls: "text-emerald-300" };
    case "reconnecting":
      return { text: "Переподключение…", cls: "text-amber-300" };
    case "error":
      return { text: "Ошибка", cls: "text-red-300" };
  }
}

function errorLabel(e: VoiceError): string {
  switch (e.code) {
    case "mic-denied":
      return "Доступ к микрофону запрещён. Разрешите в настройках браузера и нажмите «Подключить голос» снова.";
    case "mic-not-found":
      return "Микрофон не найден. Подключите устройство и попробуйте снова.";
    case "network":
      return "Нет соединения с сервисом голосового чата. Проверьте сеть и попробуйте снова.";
    case "auth":
      return "Ошибка авторизации в голосовом чате.";
    case "not-configured":
      return "Голосовой чат не настроен на сервере.";
    default:
      return e.message;
  }
}

function MicIcon({ enabled }: { enabled: boolean }) {
  return (
    <svg
      className={`w-4 h-4 ${enabled ? "text-emerald-400" : "text-white/30"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      {enabled ? (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </>
      ) : (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25-2.25m-15-3l2.25-2.25M12 3v1.5m9 9l-2.25-2.25M3.75 21l2.25-2.25m11.25-4.5-9.75-4.5M5.25 13.5h13.5" />
        </>
      )}
    </svg>
  );
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg
      className={`w-4 h-4 ${on ? "text-emerald-400" : "text-white/30"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      {on ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.25 3.75c.835 0 1.5.665 1.5 1.5v13.5c0 .835-.665 1.5-1.5 1.5-1.18 0-2.23-.728-2.52-1.858l-.546-2.212A3 3 0 005.25 14.25H3.75a1.5 1.5 0 01-1.5-1.5v-4.5a1.5 1.5 0 011.5-1.5h1.5a3 3 0 002.434-1.425l.546-1.11C8.02 4.478 9.07 3.75 10.25 3.75zm9.5 9.75V12a.75.75 0 00-.75-.75H18a.75.75 0 000 1.5h.25a.75.75 0 010 1.5h-.25a.75.75 0 000 1.5h.75a.75.75 0 00.75-.75v-.75z" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.25 3.75c.835 0 1.5.665 1.5 1.5v13.5c0 .835-.665 1.5-1.5 1.5-1.18 0-2.23-.728-2.52-1.858l-.546-2.212A3 3 0 005.25 14.25H3.75a1.5 1.5 0 01-1.5-1.5v-4.5a1.5 1.5 0 011.5-1.5h1.5a3 3 0 002.434-1.425l.546-1.11C8.02 4.478 9.07 3.75 10.25 3.75zM16.5 12h2.25m-2.25 4.5h3.75m-3.75-9h3.75" />
      )}
    </svg>
  );
}

/** Индикатор активности голоса (3 полосы). */
function VoiceActivity({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="flex items-end gap-[2px] h-3 ml-1">
      <span className="w-[3px] bg-emerald-400 rounded-full animate-pulse" style={{ height: "40%" }} />
      <span className="w-[3px] bg-emerald-400 rounded-full animate-pulse" style={{ height: "100%", animationDelay: "150ms" }} />
      <span className="w-[3px] bg-emerald-400 rounded-full animate-pulse" style={{ height: "60%", animationDelay: "300ms" }} />
    </div>
  );
}

interface Props {
  roomId: string | null;
  playerId: string;
  playerName: string;
}

export function VoiceChatPanel({ roomId, playerId, playerName }: Props) {
  const {
    status,
    participants,
    micEnabled,
    soundOn,
    error,
    connect,
    disconnect,
    toggleMic,
    toggleSound,
    retry,
  } = useLiveKitVoice(roomId, playerId, playerName);

  const st = statusLabel(status);
  const isConnected = status === "connected" || status === "reconnecting";
  const isConnecting = status === "connecting";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
      {/* Заголовок + статус */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs tracking-wider text-cyan-400/70 font-semibold">
          🎙 ГОЛОСОВОЙ ЧАТ
        </h3>
        <span className={`text-[11px] font-medium ${st.cls}`}>{st.text}</span>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="mt-2 rounded-lg bg-red-500/10 border border-red-500/25 px-3 py-2 text-xs text-red-300">
          {errorLabel(error)}
          {error.canRetry && (
            <button
              onClick={retry}
              className="ml-2 text-red-200 underline hover:text-white transition"
            >
              Повторить
            </button>
          )}
        </div>
      )}

      {/* LiveKit не настроен (503) — показываем подсказку */}
      {status === "idle" && !error && (
        <div className="mt-2 text-[11px] text-white/25">
          Голосовой чат через LiveKit. Включите микрофон, чтобы общаться.
        </div>
      )}

      {/* Кнопки действий */}
      <div className="mt-3 flex flex-wrap gap-2">
        {/* Подключить / Переподключиться */}
        {!isConnected && !isConnecting && (
          <button
            onClick={() => void connect()}
            disabled={!roomId}
            className="flex items-center gap-2 rounded-lg bg-emerald-600/60 border border-emerald-500/40 text-white text-xs font-semibold px-3 py-2 hover:bg-emerald-500/60 transition active:scale-[0.97] disabled:opacity-30"
          >
            <span className="text-sm">🎙</span>
            Подключить голос
          </button>
        )}

        {/* Подключение… */}
        {isConnecting && (
          <button
            disabled
            className="flex items-center gap-2 rounded-lg bg-white/10 border border-white/10 text-white/40 text-xs font-semibold px-3 py-2 animate-pulse"
          >
            Подключение…
          </button>
        )}

        {/* Микрофон (только когда подключены) */}
        {isConnected && (
          <button
            onClick={() => void toggleMic()}
            className={`flex items-center gap-2 rounded-lg border text-xs font-semibold px-3 py-2 transition active:scale-[0.97] ${
              micEnabled
                ? "bg-emerald-600/60 border-emerald-500/40 text-white hover:bg-emerald-500/60"
                : "bg-white/10 border-white/15 text-white/50 hover:bg-white/15"
            }`}
            title={micEnabled ? "Выключить микрофон" : "Включить микрофон"}
          >
            <MicIcon enabled={micEnabled} />
            {micEnabled ? "Микрофон вкл" : "Микрофон выкл"}
          </button>
        )}

        {/* Звук (только когда подключены) */}
        {isConnected && (
          <button
            onClick={toggleSound}
            className={`flex items-center gap-2 rounded-lg border text-xs font-semibold px-3 py-2 transition active:scale-[0.97] ${
              soundOn
                ? "bg-white/10 border-white/15 text-white/70 hover:bg-white/15"
                : "bg-white/5 border-white/10 text-white/30 hover:bg-white/10"
            }`}
            title={soundOn ? "Отключить звук" : "Включить звук"}
          >
            <SoundIcon on={soundOn} />
            {soundOn ? "Звук вкл" : "Звук выкл"}
          </button>
        )}

        {/* Выйти из голосового */}
        {isConnected && (
          <button
            onClick={() => void disconnect()}
            className="flex items-center gap-2 rounded-lg bg-red-600/40 border border-red-500/30 text-white/70 text-xs font-semibold px-3 py-2 hover:bg-red-500/40 transition active:scale-[0.97]"
            title="Отключиться от голосового чата"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 8.25l-4-4-4 4M12 4v16" />
            </svg>
            Выйти из голоса
          </button>
        )}
      </div>

      {/* Список участников (только когда подключены) */}
      {isConnected && participants.length > 0 && (
        <ul className="mt-3 space-y-1 max-h-32 overflow-y-auto">
          {participants.map((p: VoiceParticipant) => (
            <li
              key={p.id}
              className="flex items-center gap-2 text-xs text-white/60"
            >
              {/* Индикатор голоса */}
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  p.speaking ? "bg-emerald-400" : p.micEnabled ? "bg-cyan-400" : "bg-white/15"
                }`}
              />
              <span className="font-medium truncate">
                {p.name}
                {p.isSelf && <span className="text-cyan-300 ml-1">(вы)</span>}
              </span>
              {/* Микрофон */}
              <span className="ml-auto flex items-center">
                <MicIcon enabled={p.micEnabled} />
                <VoiceActivity active={p.speaking} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
