"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Game } from "./core/Game";
import type { Difficulty } from "./core/GameState";
import { loadGameState } from "./core/GameState";
import { HUD } from "./ui/HUD";
import { MainMenu } from "./ui/MainMenu";
import { GameOver } from "./ui/GameOver";

export function MazeGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [showMenu, setShowMenu] = useState(true);
  const [showGameOver, setShowGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState({ stamina: 100, battery: 100, fuses: 0, fusesTotal: 0 });
  const [stats, setStats] = useState(() => loadGameState());

  const startGame = useCallback((difficulty: Difficulty) => {
    if (containerRef.current && !gameRef.current) {
      gameRef.current = new Game(containerRef.current);
    }

    const game = gameRef.current;
    if (!game) return;

    // Esc (pointer unlock) pauses the game — show the pause menu
    game.input.onUnlock = () => {
      if (!game.isPaused) game.togglePause();
    };
    game.onPause = (p) => setPaused(p);

    game.state.difficulty = difficulty;
    game.onWin = (time) => {
      setWon(true);
      setShowGameOver(true);
      setStats(loadGameState());
    };
    game.onLose = () => {
      setWon(false);
      setShowGameOver(true);
      setStats(loadGameState());
    };
    game.onHudUpdate = (h) => setHud(h);

    setShowMenu(false);
    setShowGameOver(false);
    setPaused(false);
    game.start();
  }, []);

  const resume = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    game.togglePause();
    // Re-lock the pointer (allowed: Esc counts as a user activation)
    setTimeout(() => game.input.requestLock(game.renderer.domElement), 50);
  }, []);

  const restart = useCallback(() => {
    const difficulty = gameRef.current?.state.difficulty ?? "normal";
    startGame(difficulty);
  }, [startGame]);

  const goMenu = useCallback(() => {
    const game = gameRef.current;
    if (game && game.isPaused) game.togglePause();
    game?.input.releaseLock();
    setPaused(false);
    setShowGameOver(false);
    setShowMenu(true);
    setStats(loadGameState());
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      gameRef.current?.dispose();
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black">
      <div ref={containerRef} className="w-full h-full" />

      {!showMenu && !showGameOver && <HUD data={hud} />}

      {showMenu && (
        <MainMenu
          bestTime={stats.bestTime}
          wins={stats.wins}
          deaths={stats.deaths}
          onStart={startGame}
        />
      )}

      {paused && !showMenu && !showGameOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
          <div className="border border-stone-700 bg-stone-950/95 px-10 py-8 text-center shadow-2xl">
            <div className="mb-6 text-2xl font-black tracking-[4px] text-stone-200">ПАУЗА</div>
            <div className="flex flex-col gap-3">
              <button
                onClick={resume}
                className="border border-stone-600 bg-stone-900 px-6 py-2 font-mono text-sm tracking-widest text-stone-200 hover:bg-stone-800"
              >
                ПРОДОЛЖИТЬ
              </button>
              <button
                onClick={goMenu}
                className="border border-stone-700 bg-stone-900/50 px-6 py-2 font-mono text-sm tracking-widest text-stone-400 hover:bg-stone-800"
              >
                В МЕНЮ
              </button>
            </div>
            <p className="mt-5 text-[10px] tracking-widest text-stone-600">ESC — ПАУЗА / СВОБОДА КУРСОРА</p>
          </div>
        </div>
      )}

      {showGameOver && (
        <GameOver
          won={won}
          time={gameRef.current?.state.elapsed ?? 0}
          fusesCollected={gameRef.current?.state.fusesCollected ?? 0}
          fusesTotal={gameRef.current?.state.fusesTotal ?? 0}
          onRestart={restart}
          onMenu={goMenu}
        />
      )}
    </div>
  );
}
