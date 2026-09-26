"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PLAYERS, clubLabel, type Player } from "@/lib/players";
import { getSupabaseBrowser } from "@/lib/supabase";
import {
  addXp,
  ensureProfile,
  getDeviceId,
  getDeviceName,
  setDeviceName,
  XP_KEYS,
} from "@/lib/profile";

type Status = "match" | "close" | "no";
type Guess = { name: string; status: Status };

// Фиксированный выбор по дате — одинаковый у всех
function targetForDate(date: Date): Player {
  const d =
    date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  return PLAYERS[d % PLAYERS.length];
}

function dateLabel(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}.${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

const WEEKDAYS = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];

function evaluate(name: string, target: Player): Status {
  const p = PLAYERS.find(
    (x) =>
      x.name_ru.toLowerCase() === name.trim().toLowerCase() ||
      x.name_en.toLowerCase() === name.trim().toLowerCase()
  );
  if (!p) return "no";
  if (p.id === target.id) return "match";
  const close =
    p.country === target.country ||
    p.position === target.position ||
    Math.abs(p.birth_year - target.birth_year) <= 5 ||
    p.current_club === target.current_club;
  return close ? "close" : "no";
}

export function GuessGame() {
  // 7 дней архива: от 6 дней назад до сегодняшнего
  const days = useRef(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    })
  ).current;
  const todayIdx = 6;

  const [dayIdx, setDayIdx] = useState(todayIdx);
  const [target, setTarget] = useState<Player | null>(null);
  const [input, setInput] = useState("");
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [finished, setFinished] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const deviceId = useRef(getDeviceId());

  useEffect(() => {
    setTarget(targetForDate(days[dayIdx]));
    setGuesses([]);
    setFinished(false);
    setXpGained(0);
    setInput("");
  }, [dayIdx, days]);

  // Загрузить сохранённую игру за сегодня (если была)
  useEffect(() => {
    if (dayIdx !== todayIdx) return;
    const key = "guess_daily_" + dayKey(new Date());
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const s = JSON.parse(raw) as { guesses: Guess[]; finished: boolean; won: boolean };
        setGuesses(s.guesses);
        setFinished(s.finished);
      } catch {
        /* ignore */
      }
    }
  }, [dayIdx, todayIdx]);

  // Сохранять прогресс за сегодня
  const saveToday = useCallback(
    (g: Guess[], fin: boolean) => {
      if (dayIdx !== todayIdx) return;
      const won = fin && g[g.length - 1]?.status === "match";
      localStorage.setItem(
        "guess_daily_" + dayKey(new Date()),
        JSON.stringify({ guesses: g, finished: fin, won })
      );
    },
    [dayIdx, todayIdx]
  );

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!target || finished || !input.trim() || guesses.length >= 10) return;
      const status = evaluate(input, target);
      const next = [...guesses, { name: input.trim(), status }];
      setGuesses(next);
      setInput("");
      const fin = status === "match" || next.length >= 10;
      if (fin) setFinished(true);
      saveToday(next, fin);

      // Опыт и результат — только за сегодняшнюю игру
      if (fin && dayIdx === todayIdx && status === "match") {
        const xp = next.length === 1 ? XP_KEYS.guess_win_1 : XP_KEYS.guess_win;
        const name = getDeviceName();
        if (name) setDeviceName(name);
        ensureProfile(deviceId.current, name || "Игрок").then(() =>
          addXp(deviceId.current, xp, name).then(() => setXpGained(xp))
        );
        // Записываем результат (для статистики и активности в рейтинге)
        const sb = getSupabaseBrowser();
        if (sb) {
          sb.from("guess_results").insert({
            profile_id: deviceId.current,
            won: true,
            attempts: next.length,
          });
        }
      } else if (fin && dayIdx === todayIdx) {
        // Проигрыш тоже засчитываем (активность)
        const sb = getSupabaseBrowser();
        if (sb) {
          sb.from("guess_results").insert({
            profile_id: deviceId.current,
            won: false,
            attempts: next.length,
          });
        }
      }
    },
    [input, target, guesses, finished, dayIdx, todayIdx, saveToday]
  );

  const won = finished && guesses[guesses.length - 1]?.status === "match";
  const isToday = dayIdx === todayIdx;
  const selectedDate = days[dayIdx];

  const hints = target
    ? [
        { label: "СТРАНА", value: target.country },
        { label: "ПОЗИЦИЯ", value: target.position },
        { label: "ГОД РОЖДЕНИЯ", value: target.birth_year },
        { label: "ТЕКУЩИЙ КЛУБ", value: clubLabel(target) },
        { label: "ПЕРВЫЙ КЛУБ", value: target.debut_club },
        { label: "МАКС. СТОИМОСТЬ", value: `${target.max_market_value} млн €` },
      ]
    : [];

  return (
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
      {/* Левая колонка: поле игры */}
      <div className="rounded-2xl border border-stone-200 bg-white/70 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <small className="text-[11px] tracking-[0.2em] text-stone-500">
            {isToday ? "ЕЖЕДНЕВНАЯ ИГРА" : "АРХИВ НЕДЕЛИ"} · {dateLabel(selectedDate)}
          </small>
          <span className="text-xs text-stone-500">
            Попыток: {10 - guesses.length} из 10
          </span>
        </div>

        <h2 className="mt-3 text-3xl font-black">
          УГАДАЙ <em className="font-light italic text-stone-500">ФУТБОЛИСТА</em>
        </h2>
        <p className="mt-2 text-sm text-stone-600 max-w-md">
          Введите имя футболиста. Цвет покажет, насколько вы близки к ответу.
          Зелёный — совпадение, жёлтый — близкий (страна, позиция, возраст или
          клуб совпали), серый — мимо.
        </p>

        {/* Выбор дня (архив недели) */}
        <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
          {days.map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setDayIdx(i)}
              className={`shrink-0 w-12 rounded-xl border px-1 py-2 text-center transition ${
                i === dayIdx
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 bg-white hover:border-stone-400"
              }`}
            >
              <small
                className={`block text-[9px] ${
                  i === dayIdx ? "text-stone-400" : "text-stone-400"
                }`}
              >
                {WEEKDAYS[d.getDay()]}
              </small>
              <b className="block text-xs">
                {String(d.getDate()).padStart(2, "0")}.
                {String(d.getMonth() + 1).padStart(2, "0")}
              </b>
            </button>
          ))}
        </div>
        {!isToday && (
          <p className="mt-2 text-[11px] text-stone-400">
            Игра за {dateLabel(selectedDate)} — повтор для практики, опыт не
            начисляется.
          </p>
        )}

        <form onSubmit={submit} className="mt-5 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={finished}
            placeholder="Например: Лионель Месси"
            className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-stone-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={finished || !input.trim()}
            className="rounded-xl bg-stone-900 text-white px-5 py-3 text-sm font-semibold hover:bg-stone-700 disabled:opacity-40 transition"
          >
            ПРОВЕРИТЬ
          </button>
        </form>

        <ul className="mt-5 space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {guesses.length === 0 && (
            <li className="text-sm text-stone-400">
              Пока нет догадок. Сделайте первую попытку!
            </li>
          )}
          {guesses.map((g, i) => (
            <li
              key={i}
              className={`rounded-xl px-4 py-3 text-sm flex items-center justify-between border ${
                g.status === "match"
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : g.status === "close"
                  ? "bg-amber-200 border-amber-300"
                  : "bg-stone-100 border-stone-200 text-stone-500"
              }`}
            >
              <span className="font-medium">{g.name}</span>
              <span className="text-[11px] tracking-wider">
                {g.status === "match" ? "✓ УГАДАЛ" : g.status === "close" ? "≈ БЛИЗКО" : "✗ МИМО"}
              </span>
            </li>
          ))}
        </ul>

        {finished && (
          <div
            className={`mt-5 rounded-xl p-4 text-sm ${
              won ? "bg-emerald-500 text-white" : "bg-stone-200 text-stone-700"
            }`}
          >
            {won ? (
              <>
                🏆 <b>Победа!</b> Игрок — <b>{target!.name_ru}</b>. Угадано за{" "}
                {guesses.length} попыток.
                {isToday && xpGained > 0 && (
                  <span className="ml-2 font-bold">+{xpGained} XP</span>
                )}
              </>
            ) : (
              <>
                😔 Не угадано. Это был <b>{target!.name_ru}</b>.{" "}
                {isToday ? "Попробуйте ещё раз завтра!" : "Зато теперь вы его знаете."}
              </>
            )}
          </div>
        )}
      </div>

      {/* Правая колонка: подсказки */}
      <div className="rounded-2xl border border-stone-200 bg-white/70 p-5 sm:p-6">
        <small className="text-[11px] tracking-[0.2em] text-stone-500">
          ПОДСКАЗКИ
        </small>
        <h3 className="mt-2 text-xl font-bold">Шесть фактов об игроке</h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {hints.map((h) => (
            <div
              key={h.label}
              className="rounded-xl border border-stone-200 bg-white p-3"
            >
              <small className="text-[10px] tracking-wider text-stone-500">
                {h.label}
              </small>
              <div className="mt-1 text-sm font-semibold text-stone-900">
                {h.value}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-4 text-[11px] text-stone-500">
          <span className="flex items-center gap-1.5">
            <i className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Совпало
          </span>
          <span className="flex items-center gap-1.5">
            <i className="w-3 h-3 rounded bg-amber-300 inline-block" /> Близко
          </span>
          <span className="flex items-center gap-1.5">
            <i className="w-3 h-3 rounded bg-stone-300 inline-block" /> Не совпало
          </span>
        </div>
      </div>
    </div>
  );
}

function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
