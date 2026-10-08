"use client";

import { useState } from "react";
import type { Difficulty } from "../core/GameState";

interface MainMenuProps {
  bestTime: number | null;
  wins: number;
  deaths: number;
  raidLevel: number;
  money: number;
  onStart: (difficulty: Difficulty) => void;
}

function fmtMoney(n: number): string {
  return "$" + n.toLocaleString();
}

export function MainMenu({ bestTime, wins, deaths, raidLevel, money, onStart }: MainMenuProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
      <div className="text-center max-w-md w-full px-6">
        <h1 className="text-5xl font-black tracking-tight text-white mb-2">
          THE <span className="text-red-600">MAZE</span>
        </h1>
        <p className="text-stone-500 text-sm mb-4">
          Добудь. Перенеси. Извлеки.
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-4 text-xs text-stone-500 mb-4 flex-wrap">
          <span>
            РЕЙД: <span className="text-amber-400 font-bold">УР. {raidLevel}</span>
          </span>
          <span>
            БЮДЖЕТ: <span className="text-emerald-400 font-bold">{fmtMoney(money)}</span>
          </span>
          <span>ПОБЕД: {wins}</span>
          <span>СМЕРТЕЙ: {deaths}</span>
        </div>

        {/* Difficulty */}
        <div className="flex justify-center gap-2 mb-6">
          {(["easy", "normal", "nightmare"] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                difficulty === d
                  ? "bg-red-600 text-white"
                  : "bg-stone-800 text-stone-400 hover:bg-stone-700"
              }`}
            >
              {d === "easy" ? "EASY" : d === "normal" ? "NORMAL" : "NIGHTMARE"}
            </button>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onStart(difficulty)}
            className="px-8 py-3 bg-red-700 hover:bg-red-600 text-white font-black text-lg rounded-xl transition"
          >
            НАЧАТЬ РЕЙД
          </button>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="px-8 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-xl transition text-sm"
          >
            {showHelp ? "ЗАКРЫТЬ" : "КАК ИГРАТЬ"}
          </button>
        </div>

        {/* Help */}
        {showHelp && (
          <div className="mt-6 text-left text-xs text-stone-400 bg-stone-900/80 rounded-xl p-4 space-y-1">
            <p><b className="text-stone-200">WASD</b> — движение</p>
            <p><b className="text-stone-200">Мышь</b> — обзор</p>
            <p><b className="text-stone-200">Shift</b> — бег (тратит stamina)</p>
            <p><b className="text-stone-200">Ctrl / C</b> — присесть (тише)</p>
            <p><b className="text-stone-200">F</b> — фонарик</p>
            <p><b className="text-stone-200">E</b> — подхватить лут</p>
            <p><b className="text-stone-200">Q</b> — бросить лут</p>
            <p className="pt-2 text-stone-500">
              Ищи ценные предметы, переноси на точку извлечения (синий маяк).
              Монстр слышит шум — тяжелый лут стучит при падении.
              Выполняй квоту, чтобы пройти на следующий уровень.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
