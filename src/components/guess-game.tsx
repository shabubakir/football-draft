"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PLAYERS, type Player } from "@/lib/players";

type Status = "match" | "close" | "no";
type Guess = { name: string; status: Status };

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
  // Ежедневный выбор: фиксированный по дате
  const [target, setTarget] = useState<Player | null>(null);
  const [input, setInput] = useState("");
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const day = new Date().getDate();
    const t = PLAYERS[(day * 7) % PLAYERS.length];
    setTarget(t);
  }, []);

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!target || finished || !input.trim() || guesses.length >= 10) return;
      const status = evaluate(input, target);
      const next = [...guesses, { name: input.trim(), status }];
      setGuesses(next);
      setInput("");
      if (status === "match") setFinished(true);
      if (next.length >= 10 && status !== "match") setFinished(true);
    },
    [input, target, guesses, finished]
  );

  const won = finished && guesses[guesses.length - 1]?.status === "match";

  const hints = target
    ? [
        { label: "СТРАНА", value: target.country },
        { label: "ПОЗИЦИЯ", value: target.position },
        { label: "ГОД РОЖДЕНИЯ", value: target.birth_year },
        { label: "ТЕКУЩИЙ КЛУБ", value: target.current_club },
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
            ЕЖЕДНЕВНАЯ ИГРА · {new Date().getDate()}.
            {String(new Date().getMonth() + 1).padStart(2, "0")}.
            {new Date().getFullYear()}
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

        <form onSubmit={submit} className="mt-6 flex gap-2">
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

        <ul className="mt-5 space-y-2 max-h-[420px] overflow-y-auto pr-1">
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
              </>
            ) : (
              <>
                😔 Не угадано. Это был <b>{target!.name_ru}</b>. Попробуйте
                ещё раз завтра!
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
