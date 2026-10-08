"use client";

interface GameOverProps {
  won: boolean;
  time: number;
  fusesCollected: number;
  fusesTotal: number;
  onRestart: () => void;
  onMenu: () => void;
}

export function GameOver({ won, time, fusesCollected, fusesTotal, onRestart, onMenu }: GameOverProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-50">
      <div className="text-center">
        <h2
          className={`text-5xl font-black mb-4 ${won ? "text-emerald-400" : "text-red-600"}`}
        >
          {won ? "ВЫБРАЛСЯ" : "ПОЙМАН"}
        </h2>

        {won && (
          <p className="text-stone-400 text-lg mb-2">
            Время: <span className="text-white font-bold">{time.toFixed(1)}с</span>
          </p>
        )}

        <p className="text-stone-500 text-sm mb-8">
          Предохранители: {fusesCollected}/{fusesTotal}
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onRestart}
            className="px-6 py-3 bg-red-700 hover:bg-red-600 text-white font-black rounded-xl transition"
          >
            ЕЩЁ РАЗ
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
