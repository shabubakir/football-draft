"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { getSupabaseBrowser } from "@/lib/supabase";
import { GRID_THEMES, type GridTheme, type GridClue } from "@/lib/grid";
import { PLAYERS } from "@/lib/players";
import {
  addXp,
  ensureProfile,
  getDeviceId,
  getDeviceName,
  setDeviceName,
  XP_KEYS,
} from "@/lib/profile";

// Общий для всех сид сетки на дату (локальное время)
export function daySeed(date: Date = new Date()): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return (y * 372 + m * 31 + d) % 100000;
}

export function todayStr(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function themeOf(seed: number): GridTheme {
  return GRID_THEMES[seed % GRID_THEMES.length];
}

const MAX_MISTAKES = 3;

type DayResult = {
  won: boolean;
  correct: number;
  mistakes: number;
};

export function GridDay() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const [name, setName] = useState(() => getDeviceName());
  const [cells, setCells] = useState<(string | null)[]>(() => Array(9).fill(null));
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<DayResult | null>(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [picker, setPicker] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [xpGained, setXpGained] = useState(0);

  const seed = daySeed();
  const theme = themeOf(seed);
  const clues = theme.rows.flat();
  const dateStr = todayStr();

  // Проверка: уже играл сегодня?
  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    sb.from("grid_day_results")
      .select("won, correct, mistakes")
      .eq("device_id", deviceId)
      .eq("puzzle_date", dateStr)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAlreadyPlayed(true);
          setResult({ won: data.won, correct: data.correct, mistakes: data.mistakes });
          setFinished(true);
        }
      });
  }, [deviceId, dateStr]);

  const usedNames = cells.filter(Boolean) as string[];

  const suggestions =
    query.trim().length >= 2
      ? PLAYERS.filter(
          (p) =>
            (p.name_ru.toLowerCase().includes(query.toLowerCase()) ||
              p.name_en.toLowerCase().includes(query.toLowerCase())) &&
            !usedNames.some(
              (u) =>
                u.toLowerCase() === p.name_ru.toLowerCase() ||
                u.toLowerCase() === p.name_en.toLowerCase()
            )
        ).slice(0, 5)
      : [];

  const completeGame = useCallback(
    (won: boolean, correct: number, mistakesCount: number) => {
      setFinished(true);
      setResult({ won, correct, mistakes: mistakesCount });
      const sb = getSupabaseBrowser();
      if (!sb) return;
      sb.from("grid_day_results")
        .upsert(
          {
            device_id: deviceId,
            puzzle_date: dateStr,
            grid_seed: seed,
            won,
            correct,
            mistakes: mistakesCount,
          },
          { onConflict: "device_id,puzzle_date" }
        );
      if (won) {
        addXp(deviceId, XP_KEYS.grid_day_win, name).then((p) =>
          setXpGained(p ? XP_KEYS.grid_day_win : 0)
        );
      }
    },
    [deviceId, dateStr, seed, name]
  );

  // Проверка: игрок подходит к клетке, если его факты совпадают
  // с подсказкой СТОЛБЦА (верхний заголовок) И с подсказкой СТРОКИ (левый заголовок).
  // Клуб — по текущему/первому клубу; сборная — по стране; факт — по году/позиции.
  const clueMatches = useCallback(
    (playerIdx: number, cellIdx: number): boolean => {
      const p = PLAYERS[playerIdx];
      const col = cellIdx % 3; // столбец (верхний заголовок)
      const row = Math.floor(cellIdx / 3); // строка (левый заголовок)
      const colClue = clues[col];
      const rowClue = clues[3 + row];

      const matchClue = (c: GridClue): boolean => {
        const v = c.value.toLowerCase();
        if (c.type === "club") {
          return (
            (p.current_club ?? "").toLowerCase().includes(v) ||
            (p.debut_club ?? "").toLowerCase().includes(v) ||
            v.includes((p.current_club ?? "").toLowerCase().slice(0, 5))
          );
        }
        if (c.type === "national") {
          return (p.country ?? "").toLowerCase().includes(v) || v.includes((p.country ?? "").toLowerCase());
        }
        // award / fact
        const year = String(p.birth_year);
        const hasYear = v.includes(year) || year.includes(v.replace(/\D/g, "")) || /\d{4}/.test(v) && year === v.match(/\d{4}/)?.[0];
        const posMatch =
          (v.includes("голкипер") || v.includes("вратар")) &&
          p.position?.toLowerCase().includes("вр");
        return Boolean(hasYear) || Boolean(posMatch) || v.includes((p.name_ru ?? "").toLowerCase());
      };

      return matchClue(colClue) && matchClue(rowClue);
    },
    [clues]
  );

  const place = useCallback(
    (cellIdx: number, playerName: string) => {
      if (finished || cells[cellIdx]) return;
      const pIdx = PLAYERS.findIndex(
        (p) =>
          p.name_ru.toLowerCase() === playerName.toLowerCase() ||
          p.name_en.toLowerCase() === playerName.toLowerCase()
      );
      const ok = pIdx >= 0 && clueMatches(pIdx, cellIdx);
      const next = [...cells];
      next[cellIdx] = playerName;
      setCells(next);
      setPicker(null);
      setQuery("");

      if (!ok) {
        const m = mistakes + 1;
        setMistakes(m);
        if (m >= MAX_MISTAKES) {
          const correct = next.filter((v) => v).length;
          completeGame(false, correct, m);
        }
        return;
      }
      const filled = next.filter(Boolean).length;
      if (filled >= 9) completeGame(true, filled, mistakes);
    },
    [cells, finished, mistakes, clueMatches, completeGame]
  );

  const start = () => {
    // Профиль: запоминаем имя
    if (name.trim()) {
      setDeviceName(name.trim());
      ensureProfile(deviceId, name.trim());
    }
  };

  const dateLabel = `${String(new Date().getDate()).padStart(2, "0")}.${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <Nav />

      <small className="mt-10 block text-xs tracking-[0.2em] text-stone-500">
        СЕТКА 9 · ЕЖЕДНЕВНАЯ ИГРА · РЕЙТИНГ
      </small>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl sm:text-5xl font-black leading-tight">
          СЕТКА <em className="font-light italic text-stone-500">ДНЯ</em>
        </h1>
        <span className="text-sm text-stone-500">
          Сетка {dateLabel} · один игрок, {MAX_MISTAKES} ошибки — и провал
        </span>
      </div>
      <p className="mt-3 max-w-lg text-sm text-stone-600">
        Один футболист на каждое пересечение. Повторять нельзя. Одинаковая
        сетка у всех — результат попадает в общий рейтинг. Одна игра в день.
      </p>

      {!finished && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ваше имя (для рейтинга)"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-stone-500"
          />
          <button
            onClick={start}
            className="rounded-xl bg-stone-900 text-white px-6 py-2.5 text-sm font-bold hover:bg-stone-700 transition"
          >
            НАЧАТЬ ИГРУ →
          </button>
          {alreadyPlayed && (
            <span className="text-sm text-amber-700">
              ⚠️ Вы уже играли сегодня — результат зафиксирован.
            </span>
          )}
        </div>
      )}

      {/* Ошибки */}
      <div className="mt-5 flex items-center gap-2">
        <span className="text-xs tracking-[0.18em] text-stone-500">ОШИБКИ</span>
        {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
          <span
            key={i}
            className={`w-3 h-3 rounded-full ${
              i < mistakes ? "bg-rose-500" : "bg-stone-200"
            }`}
          />
        ))}
        {finished && result && (
          <span
            className={`ml-auto rounded-lg px-3 py-1 text-xs font-bold ${
              result.won
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {result.won ? "🏆 ПОБЕДА" : "😔 ПРОВАЛ"} · {result.correct}/9
          </span>
        )}
      </div>

      {/* Сетка: столбцы = верхние заголовки (clues 0,3,6), строки = левые (clues 1,4,7) */}
      <div className="mt-4 rounded-2xl border border-stone-200 bg-white/70 p-4 sm:p-5 overflow-x-auto">
        <div className="min-w-[560px]">
          {/* Шапка столбцов */}
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
            {clues.filter((_, i) => i % 3 === 0).map((c) => (
              <div key={c.value} className="rounded-xl bg-stone-900 text-white px-2 py-2 text-center">
                <small className="block text-[9px] tracking-wider opacity-60">
                  {c.label.toUpperCase()}
                </small>
                <span className="text-xs font-bold">{c.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 space-y-2">
            {Array.from({ length: 3 }).map((_, r) => (
              <div key={r} className="grid grid-cols-[8.5rem_1fr_1fr_1fr] gap-2">
                <div className="rounded-xl bg-stone-100 border border-stone-200 px-2 py-2 flex flex-col justify-center">
                  <small className="block text-[9px] tracking-wider text-stone-400">
                    {clues[3 + r].label.toUpperCase()}
                  </small>
                  <span className="text-xs font-bold text-stone-800">
                    {clues[3 + r].value}
                  </span>
                </div>
                {Array.from({ length: 3 }).map((_, c) => {
                  const i = r * 3 + c;
                  return (
                    <FragmentCell
                      key={i}
                      rowClue={clues[3 + r]}
                      val={cells[i]}
                      interactive={!finished && !alreadyPlayed}
                      onOpen={() => {
                        if (!cells[i]) {
                          setPicker(i);
                          setQuery("");
                        }
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Picker */}
      {picker !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 shadow-xl">
            <h4 className="font-bold text-lg">Кто подходит?</h4>
            <p className="text-xs text-stone-500 mt-0.5">
              Столбец: <b>{clues[picker % 3]?.value}</b> · Строка:{" "}
              <b>{clues[3 + Math.floor(picker / 3)]?.value}</b>
            </p>
            <div className="relative mt-3">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Начните вводить имя…"
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm outline-none focus:border-stone-500"
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl overflow-hidden shadow-lg">
                  {suggestions.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => place(picker, p.name_ru)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-stone-50 flex justify-between"
                      >
                        <span className="font-medium">{p.name_ru}</span>
                        <span className="text-xs text-stone-400">{p.country}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  if (query.trim()) place(picker, query.trim());
                }}
                className="flex-1 rounded-xl bg-stone-900 text-white py-2.5 text-sm font-semibold hover:bg-stone-700"
              >
                ОК — {query.trim() || "…"}
              </button>
              <button
                onClick={() => setPicker(null)}
                className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Результат дня */}
      {finished && (
        <div
          className={`mt-5 rounded-2xl p-5 text-center ${
            result?.won
              ? "bg-emerald-500 text-white"
              : "bg-stone-200 text-stone-700"
          }`}
        >
          <div className="text-lg font-black">
            {result?.won
              ? `🏆 Победа! +${xpGained} XP`
              : "😔 Не угадано. Сетка дня будет другой завтра."}
          </div>
          <Link
            href="/leaderboard"
            className="mt-3 inline-block rounded-xl bg-stone-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-700"
          >
            СМОТРЕТЬ РЕЙТИНГ →
          </Link>
        </div>
      )}

      {/* Мини-рейтинг сетки дня */}
      <GridDayMiniBoard period="day" myDeviceId={deviceId} />

      <div className="mt-6 flex flex-wrap gap-3 text-xs text-stone-500">
        <Link href="/grid/online" className="underline hover:text-stone-800">
          Сыграть с другом онлайн →
        </Link>
      </div>
    </main>
  );
}

function FragmentCell({
  rowClue,
  val,
  interactive,
  onOpen,
}: {
  rowClue: GridClue;
  val: string | null;
  interactive: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      disabled={!interactive || !!val}
      onClick={onOpen}
      className={`min-h-[96px] rounded-xl border p-2 text-left transition relative ${
        val
          ? "border-emerald-400 bg-emerald-50"
          : interactive
          ? "border-dashed border-stone-300 bg-stone-50 hover:border-stone-500 hover:bg-white"
          : "border-stone-200 bg-stone-50/40"
      }`}
    >
      <small className="block text-[9px] tracking-wider text-stone-400">
        {rowClue.label.toUpperCase()}
      </small>
      <div className="text-[11px] text-stone-500 mt-0.5 line-clamp-2">
        {rowClue.value}
      </div>
      {val ? (
        <div className="mt-1 text-sm font-bold text-emerald-700 truncate">
          ✓ {val}
        </div>
      ) : (
        <div className="mt-1 text-xs text-stone-400">
          {interactive ? "+ добавить" : "—"}
        </div>
      )}
    </button>
  );
}

// ======================= МИНИ-РЕЙТИНГ СЕТКИ ДНЯ =======================

import { getSupabaseBrowser as gsb } from "@/lib/supabase";
import { levelOf, rankOf } from "@/lib/profile";

function GridDayMiniBoard({
  period,
  myDeviceId,
}: {
  period: "day" | "week";
  myDeviceId: string;
}) {
  const [rows, setRows] = useState<
    Array<{ device_id: string; name: string; won: number; total: number; xp: number }>
  >([]);
  const [tab, setTab] = useState<"day" | "week">("day");

  useEffect(() => {
    const sb = gsb();
    if (!sb) return;
    const since =
      tab === "day" ? todayStr() : todayStr(new Date(Date.now() - 7 * 86400000));
    let cancel = false;
    sb.from("grid_day_results")
      .select("device_id, won")
      .gte("puzzle_date", since)
      .then(async ({ data }) => {
        if (cancel || !data) return;
        const agg = new Map<string, { won: number; total: number }>();
        for (const r of data) {
          const a = agg.get(r.device_id) ?? { won: 0, total: 0 };
          a.total++;
          if (r.won) a.won++;
          agg.set(r.device_id, a);
        }
        const ids = [...agg.keys()];
        if (ids.length === 0) return;
        const profs = await sb
          .from("players_profile")
          .select("device_id, display_name, xp")
          .in("device_id", ids);
        if (cancel) return;
        const list = [...agg.entries()]
          .map(([device_id, a]) => ({
            device_id,
            name: profs.data?.find((p) => p.device_id === device_id)?.display_name ?? "Игрок",
            won: a.won,
            total: a.total,
            xp: profs.data?.find((p) => p.device_id === device_id)?.xp ?? 0,
          }))
          .sort((a, b) => b.won - a.won || a.total - b.total)
          .slice(0, 10);
        setRows(list);
      });
    return () => {
      cancel = true;
    };
  }, [tab]);

  return (
    <div className="mt-8 rounded-2xl border border-stone-200 bg-white/70 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <small className="text-[11px] tracking-[0.2em] text-stone-500">
          РЕЙТИНГ «СЕТКИ 9» · ТОЛЬКО ЕЖЕДНЕВНЫЙ РЕЖИМ
        </small>
        <div className="flex gap-1">
          {(["day", "week"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                tab === t
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-500 hover:bg-stone-200"
              }`}
            >
              {t === "day" ? "ДЕНЬ" : "НЕДЕЛЯ"}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-stone-400">
          Пока никто не играл в этом периоде. Станьте первым!
        </p>
      ) : (
        <ul className="mt-3 space-y-1">
          {rows.map((r, i) => (
            <li
              key={r.device_id}
              className={`grid grid-cols-[2.5rem_1fr_5rem] items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                r.device_id === myDeviceId
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-stone-50/60"
              }`}
            >
              <span
                className={`font-black ${
                  i === 0 ? "text-amber-500" : "text-stone-400"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">
                <b className="truncate block">{r.name}</b>
                <small className="text-[10px] text-stone-400">
                  ур. {levelOf(r.xp)} · {rankOf(r.xp).title}
                </small>
              </span>
              <span className="text-right text-xs font-bold">
                {r.won}/{r.total}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
