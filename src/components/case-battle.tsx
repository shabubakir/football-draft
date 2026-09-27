"use client";

// CASE BATTLE — соревнование 1v1: открываем одинаковые кейсы,
// кто наберёт больше виртуальной стоимости.
// Архитектура под будущие режимы (mode в комнате, BATTLE_MODES в lib).

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CASES,
  CS2Case,
  OpenResult,
  TrackCell,
  RARITY_NAMES,
  RARITY_COLORS,
  rollCase,
  buildTrack,
  makeRng,
  WEAR_RANGES,
} from "@/lib/cs2";
import {
  BATTLE_MODES,
  BattleRoom,
  BattlePlayer,
  BattleItem,
  playerStats,
  fmtMoney,
} from "@/lib/cs2-battle";
import casePrices from "@/lib/data/cs2-prices.json";
import {
  playClick,
  playUnlock,
  playScroll,
  playFullReveal,
  setMuted,
  preloadSounds,
} from "@/lib/audio";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { usePlayerName } from "@/lib/use-player-name";

const ITEM_W = 148; // ширина карточки трека (w-36 + gap-1)
const BATTLE_DUR = 4200; // ms — немного быстрее одиночной игры (динамика матча)

// ---------- Стабильный ID устройства ----------
function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  const existing = localStorage.getItem("cs2_battle_device_id");
  if (existing) return existing;
  const id = "b" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  localStorage.setItem("cs2_battle_device_id", id);
  return id;
}

function getMyName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("grid_player_name") ?? localStorage.getItem("cs2_battle_name") ?? "";
}

function getCasePrice(name: string): number {
  const p = (casePrices as Array<{ name: string; price: number }>).find((c) => c.name === name);
  return p?.price ?? 0;
}

function fmtShort(v: number): string {
  if (v >= 100) return "$" + v.toFixed(0);
  if (v >= 1) return "$" + v.toFixed(2);
  return "$" + v.toFixed(2);
}

// ---------- Локальная история матчей (localStorage, без аккаунта) ----------
type BattleMatchRecord = {
  ts: string;
  won: boolean;
  draw: boolean;
  caseName: string;
  myTotal: number;
  oppTotal: number;
  bestPrice: number;
  oppName: string;
};

const BATTLE_HIST_KEY = "cs2_battle_history";

export function recordBattleMatch(rec: BattleMatchRecord): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(BATTLE_HIST_KEY);
    const list: BattleMatchRecord[] = raw ? JSON.parse(raw) : [];
    list.unshift(rec);
    localStorage.setItem(BATTLE_HIST_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

export function getBattleHistory(): BattleMatchRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BATTLE_HIST_KEY);
    const list: BattleMatchRecord[] = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// ---------- Карточка предмета в треке ----------
function BattleItemCard({
  label,
  img,
  color,
  isWin,
}: {
  label: string;
  img: string;
  color: string;
  isWin?: boolean;
}) {
  return (
    <div
      className="flex-shrink-0 flex flex-col rounded-lg border overflow-hidden w-36 h-44 transition-all duration-300"
      style={{
        borderColor: isWin ? color : `${color}30`,
        boxShadow: isWin ? `0 0 25px ${color}60` : undefined,
        background: `linear-gradient(180deg, ${color}12 0%, #0a0a0a 40%)`,
      }}
    >
      <div className="flex-1 flex items-center justify-center px-2 pt-2 overflow-hidden">
        <img
          src={img}
          alt={label}
          className="max-w-full max-h-full object-contain drop-shadow-lg"
          loading="lazy"
          style={{ filter: `drop-shadow(0 2px 8px ${color}40)` }}
        />
      </div>
      <div
        className="px-1.5 py-1 text-[9px] leading-tight font-semibold text-center line-clamp-2"
        style={{ color }}
      >
        {label}
      </div>
      <div className="h-1.5 w-full" style={{ background: color, opacity: 0.7 }} />
    </div>
  );
}

// ---------- Тосты (уведомления о действиях соперника) ----------
type Toast = { id: number; text: string; kind: "info" | "item" };
let toastSeq = 1;

// ---------- Главный компонент ----------
export function CaseBattle({
  initialPhase = "create",
  initialJoinCode = "",
  onExit,
  // Если авто-вход по коду упёрся в «комната полная» (я уже в этой комнате),
  // — автоматически выйти из комнаты. Нужно, чтобы страница ?code= всегда
  // подключала пользователя к комнате, даже если он в ней был раньше.
  autoLeaveIfFull = false,
}: {
  initialPhase?: "create" | "join";
  initialJoinCode?: string;
  onExit?: () => void;
  autoLeaveIfFull?: boolean;
}) {
  // --- Фаза: create | join | lobby | play | end ---
  const [phase, setPhase] = useState<"create" | "join" | "lobby" | "play" | "end">(initialPhase);
  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [myId] = useState<string>(() => getDeviceId());
  const { name: myName, setName: setMyName } = usePlayerName("cs2_battle_name");
  const [joinCode, setJoinCode] = useState(initialJoinCode);
  const [autoJoined, setAutoJoined] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [leftBy, setLeftBy] = useState<string | null>(null); // кто покинул
  const [soundOn, setSoundOn] = useState(true);
  const [matchRecorded, setMatchRecorded] = useState(false);
  const [schemaError, setSchemaError] = useState(false); // таблица cs2_battle_rooms не создана в Supabase

  // --- Локальное открытие (анимация) ---
  const [spinning, setSpinning] = useState(false);
  const [track, setTrack] = useState<TrackCell[]>([]);
  const [offset, setOffset] = useState(0);
  const [localItem, setLocalItem] = useState<BattleItem | null>(null);
  const [localTier, setLocalTier] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [revealDone, setRevealDone] = useState(false);
  const [mySeat, setMySeat] = useState<"host" | "guest">("host");
  const [myRound, setMyRound] = useState(0); // сколько я открыл
  const isHost = mySeat === "host";

  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinningRef = useRef(false); // защита: запрос завис в фоне → таймер не крутится
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const myNameRef = useRef(myName);
  myNameRef.current = myName;
  const prevOppOpens = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNotifiedOppIdx = useRef(-1);

  useEffect(() => {
    spinningRef.current = spinning;
  }, [spinning]);

  useEffect(() => {
    preloadSounds();
  }, []);

  useEffect(() => () => {
    if (animRef.current) clearInterval(animRef.current);
  }, []);

  const api = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    const res = await fetch("/api/cs2-battle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, deviceId: myId, name: myNameRef.current, ...extra }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error ?? "Ошибка запроса");
    return d as { room: BattleRoom; item?: BattleItem };
  }, [myId]);

  // Авто-вход в комнату по коду (ссылка из «ПОДЕЛИТЬСЯ»: /cs2?code=... или /cs2/battle?code=...)
  useEffect(() => {
    if (autoJoined || !initialJoinCode || room) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await api("join", { code: initialJoinCode.toUpperCase() });
        if (cancelled) return;
        setRoom(d.room);
        const me = (d.room.players ?? []).find((p) => p.id === myId);
        setMySeat(me?.seat ?? "guest");
        setPhase("lobby");
      } catch (e) {
        if (cancelled) return;
        const msg = (e as Error).message;
        // «Комната полная» при авто-входе = я уже в этой комнате.
        // Выходим (leave) и повторяем join — теперь войдём как гость.
        // ВАЖНО: делаем это ТОЛЬКО в фазе join (пока не в комнате),
        // чтобы не вылетать из активной игры при ошибках.
        if (
          autoLeaveIfFull &&
          phase === "join" &&
          !room &&
          /комната полная/i.test(msg)
        ) {
          try {
            await api("leave", { code: initialJoinCode.toUpperCase() });
          } catch {
            /* ignore */
          }
          if (cancelled) return;
          try {
            const d2 = await api("join", { code: initialJoinCode.toUpperCase() });
            if (cancelled) return;
            setRoom(d2.room);
            const me2 = (d2.room.players ?? []).find((p) => p.id === myId);
            setMySeat(me2?.seat ?? "guest");
            setPhase("lobby");
          } catch (e2) {
            if (!cancelled) {
              setError((e2 as Error).message);
              setJoinCode(initialJoinCode.toUpperCase());
            }
          }
        } else {
          setError(msg);
          setJoinCode(initialJoinCode.toUpperCase());
        }
      } finally {
        if (!cancelled) setAutoJoined(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoJoined, initialJoinCode, room, api, myId, autoLeaveIfFull]);

  const pushToast = useCallback((text: string, kind: Toast["kind"] = "info") => {
    const id = toastSeq++;
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  // ================= СОЗДАНИЕ КОМНАТЫ =================
  const createRoom = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError("Backend не настроен (Supabase). Заполните .env.local.");
      return;
    }
    setError("");
    setSchemaError(false);
    setBusy(true);
    try {
      const d = await api("create", { caseName: CASES[0].name });
      setRoom(d.room);
      setMySeat("host");
      setPhase("lobby");
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      if (/schema cache|Could not find the table/i.test(msg)) setSchemaError(true);
    } finally {
      setBusy(false);
    }
  }, [api]);

  // ================= ПОДКЛЮЧЕНИЕ ПО КОДУ =================
  const joinRoom = useCallback(
    async (codeArg?: string) => {
      if (!isSupabaseConfigured) {
        setError("Backend не настроен (Supabase). Заполните .env.local.");
        return;
      }
      setError("");
      setSchemaError(false);
      const clean = (codeArg ?? joinCode).trim().toUpperCase();
      if (clean.length < 4) {
        setError("Введите код комнаты (6 символов).");
        return;
      }
      setBusy(true);
      try {
        const d = await api("join", { code: clean });
        setRoom(d.room);
        const me = (d.room.players ?? []).find((p) => p.id === myId);
        setMySeat(me?.seat ?? "guest");
        setPhase("lobby");
      } catch (e) {
        const msg = (e as Error).message;
        setError(msg);
        if (/schema cache|Could not find the table/i.test(msg)) setSchemaError(true);
      } finally {
        setBusy(false);
      }
    },
    [api, joinCode, myId]
  );

  // ================= СТАРТ (host) =================
  const startBattle = useCallback(async () => {
    if (!room) return;
    setError("");
    setBusy(true);
    try {
      const d = await api("start", { code: room.code });
      setRoom(d.room);
      setPhase("play");
      setMyRound(0);
      playClick();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [api, room]);

  // ================= REALTIME =================
  const prevPlayersRef = useRef<BattlePlayer[] | null>(null);
  useEffect(() => {
    const sb = getSupabaseBrowser();
    supabaseRef.current = sb;
    if (!sb || !room) return;
    const roomId = room.id;
    prevPlayersRef.current = room.players ?? [];

    type RoomRow = Omit<BattleRoom, "match_seed">;
    const ch = sb
      .channel(`battle-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cs2_battle_rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          const r = payload.new as unknown as RoomRow;
          setRoom((prev) =>
            prev ? ({ ...prev, ...r } as BattleRoom) : ({ ...(r as BattleRoom) })
          );

          // Выход соперника: игрок исчез из players (leave убирает из списка).
          // Мы сами не «пропали» — наш deviceId всегда в списке, пока мы в комнате.
          const prevP = prevPlayersRef.current ?? [];
          const newP = (r.players ?? []) as BattlePlayer[];
          if (r.status === "playing" || r.status === "finished") {
            const gone = prevP.find((p) => p.id !== myId && !newP.some((n) => n.id === p.id));
            if (gone) setLeftBy(gone.name);
          } else if (r.status === "waiting") {
            setLeftBy(null); // реванш — чистое состояние
          }
          prevPlayersRef.current = newP;

          // Соперник открыл кейс
          const oppOpens = (r.rounds_data ?? []).filter(
            (x) => (isHost ? x.p2 != null : x.p1 != null)
          ).length;
          if (oppOpens > prevOppOpens.current && r.status === "playing") {
            pushToast("Соперник открыл кейс", "info");
          }
          prevOppOpens.current = oppOpens;

          // Синхронизация фазы
          if (r.status === "finished") setPhase("end");
          else if (r.status === "playing") setPhase((p) => (p === "play" ? p : "play"));
          else if (r.status === "waiting") {
            // реванш — оба в лобби
            setPhase("lobby");
          }
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(ch);
    };
  }, [room?.id, myId, isHost, pushToast]);

  // Синхронизация фазы из состояния комнаты (на случай потерянного события)
  useEffect(() => {
    if (!room) return;
    if (room.status === "finished") setPhase("end");
    else if (room.status === "playing") setPhase("play");
    else if (phase === "play" || phase === "end") setPhase("lobby");
  }, [room?.status, room?.id]);

  // ================= ОТКРЫТИЕ (своё) =================
  const openMyRound = useCallback(async () => {
    if (!room || spinning || phase !== "play" || room.status !== "playing") return;
    if (myRound >= room.rounds) return;

    setError("");
    const roundIdx = myRound;
    setSpinning(true);
    spinningRef.current = true;
    setLocalItem(null);
    setRevealDone(false);

    // 1. Спрашиваем СЕРВЕР (авторитетный результат + цена)
    const serverItem = await (async () => {
      try {
        const d = await api("open", { code: room.code, round: roundIdx, seat: mySeat });
        return d.item as BattleItem | undefined;
      } catch (e) {
        setSpinning(false);
        spinningRef.current = false;
        setError((e as Error).message);
        return undefined;
      }
    })();
    if (!serverItem) return;

    // 2. Локальная анимация: трек на основе данных предмета от сервера
    const caseDef = CASES.find((c) => c.name === room.case_name) ?? CASES[0];
    const seed = `battle-anim-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const rng = makeRng(seed);
    const openResult: OpenResult = {
      tier: serverItem.tier,
      item: serverItem.item,
      img: serverItem.img,
      isSt: serverItem.isSt,
      float: serverItem.float,
      wear: serverItem.wear as OpenResult["wear"],
    };
    const targetIndex = 95 + Math.floor(rng() * 11);
    const { cells } = buildTrack(caseDef, openResult, targetIndex, rng);

    const finishOpen = () => {
      if (animRef.current) {
        clearInterval(animRef.current);
        animRef.current = null;
      }
      setSpinning(false);
      spinningRef.current = false;
      setLocalItem(serverItem);
      setRevealDone(true);
      setMyRound((n) => n + 1);
      playFullReveal(serverItem.tier);
      // Раскрыть для соперника (после анимации)
      api("reveal", { code: room.code, round: roundIdx, seat: mySeat }).catch(() => {});
    };

    setTrack(cells);
    setOffset(0);
    setLocalTier(serverItem.tier);
    playClick();
    playUnlock();

    setTimeout(() => {
      const trackEl = document.querySelector("[data-battle-track]");
      const viewportEl = document.querySelector("[data-battle-viewport]");
      if (!trackEl || !viewportEl) {
        finishOpen();
        return;
      }
      const cards = trackEl.querySelectorAll("[data-battle-card]");
      const targetCard = cards[targetIndex];
      if (!targetCard) {
        finishOpen();
        return;
      }
      const cardRect = targetCard.getBoundingClientRect();
      const viewportRect = viewportEl.getBoundingClientRect();
      const cardCenterNow = cardRect.left + cardRect.width / 2 - viewportRect.left;
      const targetCenter = viewportRect.width / 2;
      const finalOffset = cardCenterNow - targetCenter;

      const startTime = performance.now();
      const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
      let lastTickIdx = -1;

      animRef.current = setInterval(() => {
        try {
          const elapsed = performance.now() - startTime;
          // Защита: вкладка в фоне — таймеры спят. Если прошло больше
          // длительности анимации, мгновенно доезжаем до результата.
          const progress = Math.min(elapsed / BATTLE_DUR, 1);
          const eased = elapsed > BATTLE_DUR + 3000 ? 1 : easeOutQuint(progress);
          const currentOffset = -finalOffset * eased;
          setOffset(currentOffset);

          if (eased < 1) {
            const cardIdx = Math.floor((targetCenter - currentOffset) / ITEM_W);
            if (cardIdx !== lastTickIdx && cardIdx >= 0 && cardIdx < cards.length) {
              lastTickIdx = cardIdx;
              playScroll();
            }
          }
          if (progress >= 1) finishOpen();
        } catch {
          finishOpen();
        }
      }, 16);
    }, 80);
  }, [room, spinning, phase, myRound, mySeat, api]);

  // ================= РЕВАНШ =================
  const doRematch = useCallback(async () => {
    if (!room) return;
    setError("");
    setBusy(true);
    try {
      const d = await api("rematch", { code: room.code });
      setRoom(d.room);
      setPhase("lobby");
      setMyRound(0);
      setTrack([]);
      setLocalItem(null);
      setLeftBy(null);
      setMatchRecorded(false);
      prevOppOpens.current = 0;
      lastNotifiedOppIdx.current = -1;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [api, room]);

  // ================= ВЫХОД =================
  const leaveRoom = useCallback(async () => {
    if (room) {
      try {
        await api("leave", { code: room.code });
      } catch {
        // ignore
      }
    }
    setRoom(null);
    setPhase("create");
    setTrack([]);
    setLocalItem(null);
    setMyRound(0);
    setLeftBy(null);
    setMatchRecorded(false);
    prevOppOpens.current = 0;
    lastNotifiedOppIdx.current = -1;
    onExit?.();
  }, [api, room, onExit]);

  // На экране create/join — просто выход в обычный симулятор (без leave)
  const backToSimulator = useCallback(() => {
    onExit?.();
  }, [onExit]);

  // ================= Копировать код / поделиться =================
  const copyCode = useCallback(async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      pushToast("Код скопирован!", "info");
    } catch {
      pushToast("Код: " + room.code, "info");
    }
  }, [room, pushToast]);

  const shareRoom = useCallback(async () => {
    if (!room) return;
    const link = `${window.location.origin}/cs2/battle?code=${room.code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "CASE BATTLE", text: "Сыграем в CS2 кейсы?", url: link });
      } else {
        await navigator.clipboard.writeText(link);
        pushToast("Ссылка скопирована!", "info");
      }
    } catch {
      pushToast("Ссылка: " + link, "info");
    }
  }, [room, pushToast]);

  // Уведомления о выпавших предметах соперника (раскрытых)
  useEffect(() => {
    if (!room || room.status !== "playing") return;
    const rds = room.rounds_data ?? [];
    for (let i = 0; i < rds.length; i++) {
      if (i <= lastNotifiedOppIdx.current) continue;
      const r = rds[i];
      const opp = isHost ? r.p2 : r.p1;
      const oppRevealed = isHost ? r.revealed2 : r.revealed1;
      if (opp && oppRevealed) {
        pushToast(`Соперник выбил ${opp.item} — ${fmtMoney(opp.price)}`, "item");
        lastNotifiedOppIdx.current = i;
      }
    }
  }, [room, isHost, pushToast]);

  // Сброс счётчиков уведомлений при смене комнаты/статуса
  useEffect(() => {
    lastNotifiedOppIdx.current = -1;
    prevOppOpens.current = 0;
  }, [room?.id, room?.status]);

  // ================= ВЫЧИСЛЕНИЯ =================
  const rounds = room?.rounds_data ?? [];
  const myStats = room ? playerStats(rounds, isHost ? 0 : 1) : null;
  const oppStats = room ? playerStats(rounds, isHost ? 1 : 0) : null;
  const myPlayer = room?.players.find((p) => p.seat === mySeat);
  const oppPlayer = room?.players.find((p) => p.seat !== mySeat);
  const myOpens = myStats?.opened ?? 0;
  const oppOpens = oppStats?.opened ?? 0;
  const myRevealed = room
    ? (room.rounds_data ?? []).filter((r) => (isHost ? r.revealed1 : r.revealed2)).length
    : 0;

  const caseDef: CS2Case | undefined = room
    ? CASES.find((c) => c.name === room.case_name)
    : undefined;
  const casePrice = caseDef ? getCasePrice(caseDef.name) : 0;

  // ================= ИСТОРИЯ МАТЧА (запись в localStorage при финале) =================
  useEffect(() => {
    if (
      !room ||
      room.status !== "finished" ||
      matchRecorded ||
      !room.rounds_data?.every((r) => r.p1 && r.p2)
    )
      return;
    setMatchRecorded(true);
    recordBattleMatch({
      ts: new Date().toISOString(),
      won: room.winner === mySeat,
      draw: room.winner === "draw",
      caseName: room.case_name,
      myTotal: myStats?.total ?? 0,
      oppTotal: oppStats?.total ?? 0,
      bestPrice: myStats?.bestPrice ?? 0,
      oppName: oppPlayer?.name ?? "Соперник",
    });
  }, [room, matchRecorded, mySeat, myStats, oppStats, oppPlayer]);

  // ================= RENDERS =================

  // ---------- Экран: создание / вход ----------
  if (phase === "create" || phase === "join") {
    const isCreate = phase === "create";
    const hist = getBattleHistory();
    const wins = hist.filter((h) => h.won).length;
    const losses = hist.filter((h) => !h.won && !h.draw).length;
    const decided = wins + losses;
    const winRate = decided ? Math.round((wins / decided) * 100) : 0;
    const bestWin = hist.reduce((m, h) => Math.max(m, h.won ? h.myTotal - h.oppTotal : 0), 0);
    const bestItem = hist.reduce((m, h) => Math.max(m, h.bestPrice), 0);
    const last = hist[0];
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <button
          onClick={backToSimulator}
          className="text-sm text-stone-500 hover:text-white transition"
        >
          ← Одиночная игра
        </button>
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ffd700]/15 border border-[#ffd700]/40 text-[#ffd700] text-xs font-black tracking-widest">
            ⚔ CASE BATTLE
          </div>
          <h2 className="text-2xl font-black text-white">
            {isCreate ? "Создать комнату" : "Войти по коду"}
          </h2>
          <p className="text-sm text-stone-400">
            Открытие кейсов 1 на 1. У каждого стартовый банк $10 000 и 10 открытий.
            Кто наберёт больше — тот победил.
          </p>
        </div>

        {/* Имя */}
        <div className="bg-white/[0.03] rounded-xl border border-white/5 p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-400 mb-1.5 uppercase tracking-wider">
              Ваше имя
            </label>
            <input
              value={myName}
              onChange={(e) => setMyName(e.target.value.slice(0, 24))}
              placeholder="Игрок"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-stone-600 focus:outline-none focus:border-[#ffd700]/50"
            />
          </div>
          <div className="text-xs text-stone-500">
            Кейс: <b className="text-stone-300">{CASES[0].name}</b> · Банк:{" "}
            <b className="text-stone-300">$10 000</b> · Открытий: <b className="text-stone-300">10</b>
          </div>
          {!isSupabaseConfigured && (
            <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              ⚠️ Supabase не настроен — онлайн-режим недоступен. Заполните .env.local.
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">
            {error}
          </div>
        )}

        {schemaError && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-2 text-sm">
            <div className="text-amber-300 font-bold">
              ⚠️ Таблица <code className="font-mono">cs2_battle_rooms</code> не создана в Supabase.
            </div>
            <p className="text-stone-400 text-xs leading-relaxed">
              Откройте файл миграции и выполните его в Supabase Dashboard → SQL Editor
              (кнопка «Run»), затем повторите создание комнаты.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  window.open(
                    "https://supabase.com/dashboard/_/database/sql/new",
                    "_blank",
                    "noopener"
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold transition"
              >
                ОТКРЫТЬ SQL EDITOR →
              </button>
              <a
                href="/sql/20260927_cs2_battle_rooms.sql"
                download="20260927_cs2_battle_rooms.sql"
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-stone-300 text-xs font-bold transition"
              >
                СКАЧАТЬ SQL
              </a>
            </div>
          </div>
        )}

        {isCreate ? (
          <button
            onClick={createRoom}
            disabled={busy}
            className="w-full py-4 rounded-xl font-black text-lg tracking-wider bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-stone-950 hover:scale-[1.02] transition disabled:opacity-50"
          >
            {busy ? "СОЗДАЁМ..." : "СОЗДАТЬ КОМНАТУ"}
          </button>
        ) : (
          <div className="space-y-3">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="XXXXXX"
              className="w-full text-center text-2xl font-mono font-black tracking-[0.5em] px-3 py-4 bg-white/5 border border-white/10 rounded-xl text-[#ffd700] placeholder-stone-700 focus:outline-none focus:border-[#ffd700]/50"
              maxLength={6}
            />
            <button
              onClick={() => joinRoom()}
              disabled={busy}
              className="w-full py-4 rounded-xl font-black text-lg tracking-wider bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-stone-950 hover:scale-[1.02] transition disabled:opacity-50"
            >
              {busy ? "ПОДКЛЮЧАЕМ..." : "ПОДКЛЮЧИТЬСЯ"}
            </button>
          </div>
        )}

        <div className="flex justify-center gap-4 text-sm">
          <button
            onClick={() => setPhase("join")}
            className="text-stone-400 hover:text-white transition"
          >
            У меня есть код →
          </button>
          <button
            onClick={() => setPhase("create")}
            className="text-stone-400 hover:text-white transition"
          >
            ← Создать комнату
          </button>
        </div>

        {/* История матчей (локальная статистика) */}
        {hist.length > 0 && (
          <div className="bg-white/[0.03] rounded-xl border border-white/5 p-4 space-y-3">
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest text-center">
              Ваша история
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/[0.03] rounded-lg p-2.5">
                <div className="text-[9px] font-bold text-stone-500 uppercase">Матчи</div>
                <div className="text-lg font-black text-white">{hist.length}</div>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-2.5">
                <div className="text-[9px] font-bold text-stone-500 uppercase">Победы / Поражения</div>
                <div className="text-lg font-black">
                  <span className="text-[#4ade80]">{wins}</span>
                  <span className="text-stone-600"> / </span>
                  <span className="text-red-300">{losses}</span>
                </div>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-2.5">
                <div className="text-[9px] font-bold text-stone-500 uppercase">Win rate</div>
                <div className="text-lg font-black text-[#ffd700]">{winRate}%</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white/[0.03] rounded-lg p-2.5">
                <div className="text-[9px] font-bold text-stone-500 uppercase">Лучший выигрыш</div>
                <div className="text-base font-black text-[#4ade80]">
                  {bestWin > 0 ? "+" + fmtMoney(bestWin) : "—"}
                </div>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-2.5">
                <div className="text-[9px] font-bold text-stone-500 uppercase">Самый дорогой предмет</div>
                <div className="text-base font-black text-[#ffd700]">
                  {bestItem > 0 ? fmtMoney(bestItem) : "—"}
                </div>
              </div>
            </div>
            {last && (
              <div className="text-xs text-stone-400 text-center border-t border-white/5 pt-2.5">
                Последний матч:{" "}
                <b className={last.won ? "text-[#4ade80]" : last.draw ? "text-stone-300" : "text-red-300"}>
                  {last.won ? "победа" : last.draw ? "ничья" : "поражение"}
                </b>{" "}
                {fmtMoney(last.myTotal)} — {fmtMoney(last.oppTotal)} vs {last.oppName}
                <span className="text-stone-600"> · {last.caseName}</span>
              </div>
            )}
          </div>
        )}

        {/* Режимы (заглушки под будущее) */}
        <div className="pt-2">
          <div className="text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-2 text-center">
            Скоро
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {BATTLE_MODES.filter((m) => !m.available).map((m) => (
              <span
                key={m.id}
                className="px-2.5 py-1 rounded-md text-[10px] font-bold text-stone-600 border border-white/5 bg-white/[0.02]"
                title={m.desc}
              >
                {m.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Экран: лобби ----------
  if (phase === "lobby") {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ffd700]/15 border border-[#ffd700]/40 text-[#ffd700] text-xs font-black tracking-widest">
            ⚔ CASE BATTLE
          </div>
          <h2 className="text-3xl font-black text-white mt-3">Лобби</h2>
        </div>

        {/* Код комнаты */}
        <div className="bg-white/[0.03] rounded-xl border border-white/10 p-5 text-center space-y-3">
          <div className="text-xs font-bold text-stone-500 uppercase tracking-widest">
            Код комнаты
          </div>
          <div className="text-4xl sm:text-5xl font-mono font-black tracking-[0.3em] text-[#ffd700]">
            {room?.code}
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <button
              onClick={copyCode}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold text-white transition"
            >
              📋 СКОПИРОВАТЬ КОД
            </button>
            <button
              onClick={shareRoom}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold text-white transition"
            >
              🔗 ПОДЕЛИТЬСЯ
            </button>
          </div>
          <p className="text-xs text-stone-500">
            Друг вводит код на странице «CS2 КЕЙСЫ → ИГРАТЬ С ДРУГОМ» или открывается по ссылке.
          </p>
        </div>

        {/* Игроки */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <PlayerBadge
            label="ИГРОК 1"
            name={myPlayer?.name ?? "Хост"}
            you={isHost}
            online
          />
          <div className="text-2xl font-black text-stone-600">VS</div>
          <PlayerBadge
            label="ИГРОК 2"
            name={
              (room?.players ?? []).find((p) => p.seat !== mySeat)?.name ??
              (room && (room.players ?? []).length < 2 ? "Ждём игрока..." : "Игрок")
            }
            you={!isHost}
            online={!!(room?.players ?? []).find((p) => p.seat !== mySeat)}
            waiting={(room?.players ?? []).length < 2}
          />
        </div>

        {/* Настройки матча */}
        <div className="bg-white/[0.03] rounded-xl border border-white/5 p-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
              Стартовый банк
            </div>
            <div className="text-lg font-black text-[#4ade80]">${(room?.bank ?? 10000).toLocaleString("ru-RU")}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
              Открытий
            </div>
            <div className="text-lg font-black text-white">{room?.rounds ?? 10}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
              Кейс
            </div>
            <div className="text-sm font-black text-[#ffd700] truncate">
              {caseDef?.name ?? "—"}
            </div>
            {casePrice > 0 && (
              <div className="text-[10px] text-stone-500">${casePrice.toFixed(2)} / шт</div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">
            {error}
          </div>
        )}

        {isHost ? (
          <button
            onClick={startBattle}
            disabled={busy || (room?.players ?? []).length < 2}
            className="w-full py-4 rounded-xl font-black text-lg tracking-wider bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-stone-950 hover:scale-[1.02] transition disabled:opacity-40 disabled:hover:scale-100"
          >
            {busy ? "СТАРТ..." : (room?.players ?? []).length < 2 ? "ЖДИМ ИГРОКА 2..." : "НАЧАТЬ БИТВУ"}
          </button>
        ) : (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-stone-400 text-sm">
              <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
              Ждём, пока хост начнёт битву...
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={leaveRoom}
            className="text-sm text-stone-500 hover:text-red-400 transition"
          >
            ← Выйти из матча
          </button>
        </div>
      </div>
    );
  }

  // ---------- Экран: БИТВА ----------
  if (phase === "play" || phase === "end") {
    const myTotal = myStats?.total ?? 0;
    const oppTotal = oppStats?.total ?? 0;
    const allRevealed =
      rounds.length > 0 &&
      rounds.every((r) => r.p1 == null || (r.revealed1 && r.revealed2));

    return (
      <div className="space-y-5">
        {/* Header матча */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#ffd700]/15 border border-[#ffd700]/40 text-[#ffd700] text-[10px] font-black tracking-widest">
              ⚔ CASE BATTLE
            </span>
            <span className="text-xs text-stone-500 hidden sm:inline">
              {caseDef?.name} · {room?.code}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                setMuted(!next);
              }}
              className="p-2 rounded-lg border text-sm transition bg-white/5 hover:bg-white/10"
            >
              {soundOn ? "🔊" : "🔇"}
            </button>
            <button
              onClick={leaveRoom}
              className="px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition"
            >
              Выйти
            </button>
          </div>
        </div>

        {leftBy && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3 flex items-center justify-between">
            <span>💔 Соперник покинул матч: {leftBy}</span>
            <button
              onClick={leaveRoom}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-bold"
            >
              В меню
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">
            {error}
          </div>
        )}

        {/* Счёты игроков */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 sm:gap-4">
          <ScorePanel
            side="my"
            label={myPlayer?.name ?? "ВЫ"}
            you
            total={myTotal}
            last={myStats?.best ?? null}
            opened={myOpens}
            revealed={myRevealed}
            rounds={room?.rounds ?? 10}
            spinning={spinning}
          />
          <div className="flex items-center justify-center">
            <span className="text-xl sm:text-3xl font-black text-stone-600">VS</span>
          </div>
          <ScorePanel
            side="opp"
            label={oppPlayer?.name ?? "СОПЕРНИК"}
            you={false}
            total={oppTotal}
            last={oppStats?.best ?? null}
            opened={oppOpens}
            revealed={
              room
                ? (room.rounds_data ?? []).filter((r) => (isHost ? r.revealed2 : r.revealed1)).length
                : 0
            }
            rounds={room?.rounds ?? 10}
            spinning={false}
          />
        </div>

        {/* Трэк анимации (только свой) */}
        {(spinning || localItem) && (
          <div className="relative">
            {/* Центральный маркер */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-[#ffd700] z-10 shadow-[0_0_10px_#ffd700]" />
            <div className="absolute left-1/2 top-0 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-[#ffd700] z-10" />

            <div
              data-battle-viewport
              className="overflow-hidden rounded-xl border border-white/10 bg-stone-950/80 h-48 sm:h-52 relative"
              style={{
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
              }}
            >
              {track.length > 0 ? (
                <div
                  data-battle-track
                  className="flex gap-1 items-center h-full px-1"
                  style={{ transform: `translateX(${offset}px)`, willChange: "transform" }}
                >
                  {track.map((cell, i) => (
                    <div key={i} data-battle-card>
                      <BattleItemCard
                        label={cell.label}
                        img={cell.img}
                        color={cell.color}
                        isWin={!spinning && localItem != null && i === 95 + 5}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-600 text-sm">
                  {spinning ? "ЗАГРУЗКА..." : ""}
                </div>
              )}
            </div>

            {/* Оверлей результата */}
            {localItem && !spinning && (
              <div className="absolute inset-0 flex items-end justify-center pb-4 z-20 pointer-events-none">
                <div
                  className={`flex items-center gap-3 sm:gap-4 bg-stone-950/95 backdrop-blur rounded-xl px-4 sm:px-5 py-3 border ${
                    localItem.tier >= 3
                      ? "animate-pulse"
                      : localItem.tier === 2
                      ? ""
                      : ""
                  }`}
                  style={{
                    borderColor: `${RARITY_COLORS[localItem.tier]}60`,
                    boxShadow:
                      localItem.tier >= 3
                        ? `0 0 60px ${RARITY_COLORS[localItem.tier]}70, 0 0 120px ${RARITY_COLORS[localItem.tier]}30`
                        : `0 0 40px ${RARITY_COLORS[localItem.tier]}40`,
                  }}
                >
                  <img
                    src={localItem.img}
                    alt={localItem.item}
                    className="w-20 sm:w-24 h-20 sm:h-24 object-contain drop-shadow-xl"
                    style={{
                      filter: `drop-shadow(0 0 ${localItem.tier >= 3 ? 18 : 10}px ${RARITY_COLORS[localItem.tier]}80)`,
                    }}
                  />
                  <div>
                    <div
                      className="text-base sm:text-xl font-black"
                      style={{ color: RARITY_COLORS[localItem.tier] }}
                    >
                      {localItem.item}
                    </div>
                    <div
                      className="text-[10px] sm:text-xs font-bold mt-1 px-2.5 py-0.5 rounded-full inline-block"
                      style={{
                        color: RARITY_COLORS[localItem.tier],
                        background: `${RARITY_COLORS[localItem.tier]}20`,
                      }}
                    >
                      {RARITY_NAMES[localItem.tier]}
                      {localItem.isSt && " · STATTRAK™"}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] sm:text-xs font-mono text-stone-400">
                        Float: {localItem.float.toFixed(4)}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded bg-white/10 text-stone-300">
                        {WEAR_RANGES[localItem.wear as keyof typeof WEAR_RANGES]?.ru ?? localItem.wear}
                      </span>
                    </div>
                    {localItem.price > 0 && (
                      <div
                        className={`font-black mt-1.5 ${
                          localItem.price >= 1000
                            ? "text-2xl text-[#ffd700]"
                            : localItem.price >= 100
                            ? "text-xl text-[#4ade80]"
                            : "text-base text-[#4ade80]"
                        }`}
                      >
                        + {fmtMoney(localItem.price)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Кнопка КРУТИТЬ */}
        {phase === "play" && (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={openMyRound}
              disabled={spinning || myOpens >= (room?.rounds ?? 10) || !!leftBy}
              className={`w-full sm:w-auto sm:min-w-72 px-10 py-4 rounded-xl font-black text-lg tracking-wider transition-all ${
                spinning || myOpens >= (room?.rounds ?? 10) || leftBy
                  ? "bg-white/5 text-stone-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-stone-950 hover:scale-105 shadow-lg shadow-[#ffd700]/20"
              }`}
            >
              {spinning
                ? "КРУТИМСЯ..."
                : myOpens >= (room?.rounds ?? 10)
                ? "ВСЕ ОТКРЫТО"
                : `КРУТИТЬ (${myOpens + 1}/${room?.rounds ?? 10})`}
            </button>
            {leftBy && (
              <button onClick={leaveRoom} className="text-sm text-stone-400 hover:text-white">
                ← Вернуться в главное меню
              </button>
            )}
          </div>
        )}

        {/* Тосты */}
        <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xl border backdrop-blur ${
                t.kind === "item"
                  ? "bg-stone-900/95 border-[#ffd700]/40 text-[#ffd700]"
                  : "bg-stone-900/95 border-white/10 text-stone-300"
              }`}
            >
              {t.text}
            </div>
          ))}
        </div>

        {/* ---------- ФИНАЛ ---------- */}
        {phase === "end" && room && (
          <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-stone-950 border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-5 my-8">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ffd700]/15 border border-[#ffd700]/40 text-[#ffd700] text-xs font-black tracking-widest">
                  ⚔ CASE BATTLE
                </div>
                <h2 className="text-3xl font-black text-white mt-3">
                  {room.winner === "draw"
                    ? "НИЧЬЯ!"
                    : room.winner === mySeat
                    ? "🏆 ПОБЕДА!"
                    : "ПОРАЖЕНИЕ"}
                </h2>
                <p className="text-sm text-stone-400 mt-1">
                  {room.winner === "draw"
                    ? "У обоих одинаковый банк"
                    : room.winner === mySeat
                    ? `Ваш банк больше, чем у ${oppPlayer?.name ?? "соперника"}`
                    : `${oppPlayer?.name ?? "Соперник"} набрал больше`}
                </p>
              </div>

              {/* Итоги */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <FinalCard
                  name={myPlayer?.name ?? "ВЫ"}
                  you
                  total={myTotal}
                  stats={myStats}
                />
                <div className="text-2xl font-black text-stone-600">VS</div>
                <FinalCard
                  name={oppPlayer?.name ?? "СОПЕРНИК"}
                  you={false}
                  total={oppTotal}
                  stats={oppStats}
                />
              </div>

              {/* Статистика */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-[10px] font-bold text-stone-500 uppercase">Открыто кейсов</div>
                  <div className="text-lg font-black text-white">
                    {myOpens}/{room.rounds} — {oppOpens}/{room.rounds}
                  </div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-[10px] font-bold text-stone-500 uppercase">
                    Среднее открытие
                  </div>
                  <div className="text-lg font-black text-white">
                    {fmtShort(myStats?.avg ?? 0)} — {fmtShort(oppStats?.avg ?? 0)}
                  </div>
                </div>
              </div>

              {/* Кнопки */}
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={doRematch}
                  disabled={busy}
                  className="px-6 py-3 rounded-xl font-black text-sm tracking-wider bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-stone-950 hover:scale-105 transition disabled:opacity-50"
                >
                  ⚔ РЕВАНШ
                </button>
                <button
                  onClick={() => {
                    setRoom(null);
                    setPhase("create");
                    setTrack([]);
                    setLocalItem(null);
                    setMyRound(0);
                    setLeftBy(null);
                    setMatchRecorded(false);
                    setError("");
                  }}
                  className="px-6 py-3 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 text-white transition"
                >
                  ИГРАТЬ ЕЩЁ
                </button>
                <button
                  onClick={leaveRoom}
                  className="px-6 py-3 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 text-white transition"
                >
                  НА ГЛАВНУЮ
                </button>
              </div>
              <Link
                href="/cs2"
                className="block text-center text-xs text-stone-500 hover:text-stone-300"
              >
                ← к одиночной игре
              </Link>
            </div>
          </div>
        )}

        {/* Если всё открыто, но ещё не финал — ждём раскрытия соперника */}
        {phase === "play" && allRevealed && (
          <div className="text-center text-sm text-stone-400 animate-pulse">
            Завершаем матч...
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ---------- Панель счёта игрока ----------
function ScorePanel({
  label,
  total,
  last,
  opened,
  revealed,
  rounds,
  spinning,
  you,
}: {
  side: "my" | "opp";
  label: string;
  you: boolean;
  total: number;
  last: { price: number; item: string } | null;
  opened: number;
  revealed: number;
  rounds: number;
  spinning: boolean;
}) {
  const delta = last?.price ?? 0;
  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 ${
        you
          ? "border-[#4ade80]/30 bg-[#4ade80]/5"
          : "border-red-400/30 bg-red-400/5"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-black uppercase tracking-widest text-stone-500 truncate">
          {you ? "🟢 " : "🔴 "}
          {label}
          {you && <span className="text-[#4ade80]"> (ВЫ)</span>}
        </div>
        {spinning && (
          <span className="text-[9px] font-bold text-[#ffd700] animate-pulse">КРУТИТ</span>
        )}
      </div>
      <div
        className={`text-2xl sm:text-4xl font-black mt-1 ${
          you ? "text-[#4ade80]" : "text-red-300"
        }`}
      >
        ${Math.round(total + (spinning ? 0 : 0)).toLocaleString("ru-RU")}
      </div>
      {delta > 0 && (
        <div className="text-xs font-bold text-[#4ade80] mt-0.5">+ {fmtMoney(delta)}</div>
      )}
      <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-stone-500">
        <span>
          {revealed}/{rounds}
        </span>
        <span>{opened}/{rounds} откр.</span>
      </div>
      {/* Прогресс-бар */}
      <div className="h-1.5 bg-white/10 rounded-full mt-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            you ? "bg-[#4ade80]" : "bg-red-400"
          }`}
          style={{ width: `${Math.min(100, (revealed / rounds) * 100)}%` }}
        />
      </div>
    </div>
  );
}

// ---------- Игрок в лобби ----------
function PlayerBadge({
  label,
  name,
  you,
  online,
  waiting,
}: {
  label: string;
  name: string;
  you: boolean;
  online: boolean;
  waiting?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 text-center ${
        waiting
          ? "border-white/10 bg-white/[0.02]"
          : you
          ? "border-[#4ade80]/30 bg-[#4ade80]/5"
          : "border-red-400/30 bg-red-400/5"
      }`}
    >
      <div className="text-[10px] font-black uppercase tracking-widest text-stone-500">
        {label}
        {you && <span className="text-[#4ade80]"> · ВЫ</span>}
      </div>
      <div className="text-lg font-black text-white mt-1 truncate">{name || "—"}</div>
      <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold">
        <span
          className={`w-2 h-2 rounded-full ${
            waiting ? "bg-stone-600" : online ? "bg-[#4ade80] animate-pulse" : "bg-red-500"
          }`}
        />
        <span className={waiting ? "text-stone-500" : online ? "text-[#4ade80]" : "text-red-400"}>
          {waiting ? "ждём подключения" : online ? "в сети" : "не в сети"}
        </span>
      </div>
    </div>
  );
}

// ---------- Итоговая карточка (финал) ----------
function FinalCard({
  name,
  you,
  total,
  stats,
}: {
  name: string;
  you: boolean;
  total: number;
  stats: { opened: number; best: { item: string; price: number } | null; avg: number } | null;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        you ? "border-[#4ade80]/40 bg-[#4ade80]/10" : "border-red-400/30 bg-red-400/5"
      }`}
    >
      <div className="text-xs font-black text-white truncate">{name}</div>
      <div
        className={`text-2xl font-black mt-1 ${you ? "text-[#4ade80]" : "text-red-300"}`}
      >
        {fmtMoney(total)}
      </div>
      <div className="text-[10px] text-stone-500 mt-2 space-y-0.5">
        <div>Открыто: {stats?.opened ?? 0}</div>
        <div>
          Среднее: <span className="text-stone-300">{fmtShort(stats?.avg ?? 0)}</span>
        </div>
        <div className="truncate">
          Лучший:{" "}
          <span className="text-[#ffd700]">
            {stats?.best ? `${stats.best.item} (${fmtShort(stats.best.price)})` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
