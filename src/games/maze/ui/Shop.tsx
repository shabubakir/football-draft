"use client";

import { useState } from "react";
import {
  UPGRADES,
  upgradeCost,
  type EconomyState,
  type UpgradeId,
} from "../core/Economy";

interface ShopProps {
  economy: EconomyState;
  result: {
    won: boolean;
    banked: number;
    quota: number;
    total: number;
    nextLevel: number;
  };
  onBuy: (id: UpgradeId) => void;
  onNextRaid: () => void;
  onMenu: () => void;
}

const UPGRADE_ORDER: UpgradeId[] = [
  "capacity",
  "speed",
  "stamina",
  "flashlight",
  "battery",
  "health",
];

function fmtMoney(n: number): string {
  return "$" + n.toLocaleString();
}

export function Shop({ economy, result, onBuy, onNextRaid, onMenu }: ShopProps) {
  const [hovered, setHovered] = useState<UpgradeId | null>(null);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50 overflow-y-auto">
      <div className="max-w-lg w-full px-6 py-8">
        {/* Result header */}
        <div className="text-center mb-6">
          <h2
            className={`text-4xl font-black mb-2 ${
              result.won ? "text-emerald-400" : "text-red-600"
            }`}
          >
            {result.won ? "ЗАХВАТ УДАЛСЯ" : "ПОЙМАН"}
          </h2>
          <div className="flex justify-center gap-6 text-sm text-stone-400">
            <span>
              В казне:{" "}
              <span className="text-amber-400 font-bold">
                {fmtMoney(result.banked)}
              </span>
            </span>
            <span>
              Квота:{" "}
              <span
                className={`font-bold ${
                  result.banked >= result.quota ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {fmtMoney(result.quota)}
              </span>
            </span>
          </div>
          {result.won && result.banked >= result.quota && (
            <p className="text-stone-500 text-xs mt-1">
              Следующий рейд: уровень {result.nextLevel}
            </p>
          )}
        </div>

        {/* Money display */}
        <div className="text-center mb-6">
          <span className="text-[10px] font-bold tracking-widest text-stone-500">
            БЮДЖЕТ
          </span>
          <div className="text-3xl font-black text-emerald-400">
            {fmtMoney(economy.money)}
          </div>
        </div>

        {/* Upgrades */}
        <div className="space-y-2 mb-6">
          {UPGRADE_ORDER.map((id) => {
            const def = UPGRADES[id];
            const level = economy.upgrades[id] ?? 0;
            const maxed = level >= def.maxLevel;
            const cost = upgradeCost(economy, id);
            const affordable = economy.money >= cost;
            const canBuy = !maxed && affordable;

            return (
              <button
                key={id}
                onClick={() => canBuy && onBuy(id)}
                onMouseEnter={() => setHovered(id)}
                onMouseLeave={() => setHovered(null)}
                disabled={!canBuy}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition text-left ${
                  canBuy
                    ? "border-stone-600 bg-stone-900 hover:bg-stone-800 cursor-pointer"
                    : maxed
                      ? "border-emerald-800/50 bg-emerald-950/30 cursor-default"
                      : "border-stone-800 bg-stone-950/50 cursor-default opacity-60"
                }`}
              >
                <div>
                  <div className="text-sm font-bold text-stone-200">{def.name}</div>
                  <div className="text-[11px] text-stone-500">{def.desc}</div>
                  {hovered === id && !maxed && (
                    <div className="text-[10px] text-stone-400 mt-0.5">
                      Следующий уровень: {fmtMoney(cost)}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {maxed ? (
                    <span className="text-emerald-500 text-xs font-bold">MAX</span>
                  ) : (
                    <span
                      className={`text-sm font-bold ${
                        affordable ? "text-emerald-400" : "text-stone-600"
                      }`}
                    >
                      {fmtMoney(cost)}
                    </span>
                  )}
                  {/* Level pips */}
                  <div className="flex gap-1 mt-1 justify-end">
                    {Array.from({ length: def.maxLevel }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < level ? "bg-emerald-500" : "bg-stone-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onNextRaid}
            className="flex-1 px-6 py-3 bg-red-700 hover:bg-red-600 text-white font-black rounded-xl transition text-lg"
          >
            СЛЕДУЮЩИЙ РЕЙД
          </button>
          <button
            onClick={onMenu}
            className="px-6 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-xl transition"
          >
            МЕНЮ
          </button>
        </div>
      </div>
    </div>
  );
}
