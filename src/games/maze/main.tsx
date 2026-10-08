"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Game } from "./core/Game";
import type { Difficulty } from "./core/GameState";
import { loadGameState } from "./core/GameState";
import { loadEconomy, saveEconomy, buyUpgrade, type EconomyState, type UpgradeId } from "./core/Economy";
import { HUD, type HudData } from "./ui/HUD";
import { MainMenu } from "./ui/MainMenu";
import { Shop } from "./ui/Shop";

interface RaidResult {
  won: boolean;
  banked: number;
  quota: number;
  total: number;
  nextLevel: number;
}

export function MazeGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [showMenu, setShowMenu] = useState(true);
  const [showShop, setShowShop] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState<HudData>({
    stamina: 100,
    battery: 100,
    fuses: 0,
    fusesTotal: 0,
    banked: 0,
    quota: 5000,
    carried: 0,
    timeLeft: 480,
    event: null,
  });
  const [result, setResult] = useState<RaidResult | null>(null);
  const [economy, setEconomy] = useState<EconomyState>(() => loadEconomy());
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
    let raidSettled = false;
    const settle = (won: boolean) => {
      if (raidSettled) return;
      raidSettled = true;
      const r = game.finishRaid(won);
      setResult(r);
      setEconomy(loadEconomy());
      setStats(loadGameState());
      setShowShop(true);
    };
    game.onWin = (time: number) => {
      void time;
      settle(game.state.banked >= game.state.quota);
    };
    game.onLose = () => {
      settle(false);
    };
    game.onHudUpdate = (h) => setHud(h);

    // Test hook for Playwright QA (same-origin only, harmless in prod)
    (window as unknown as { __mazeGame?: Game }).__mazeGame = game;

    setShowMenu(false);
    setShowShop(false);
    setPaused(false);
    setResult(null);
    game.startRaid();
  }, []);

  const resume = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    game.togglePause();
    // Re-lock the pointer (allowed: Esc counts as a user activation)
    setTimeout(() => game.input.requestLock(game.renderer.domElement), 50);
  }, []);

  const goMenu = useCallback(() => {
    const game = gameRef.current;
    if (game && game.isPaused) game.togglePause();
    game?.input.releaseLock();
    setPaused(false);
    setShowShop(false);
    setShowMenu(true);
    setEconomy(loadEconomy());
    setStats(loadGameState());
  }, []);

  const nextRaid = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    setShowShop(false);
    setResult(null);
    const difficulty = game.state.difficulty;
    startGame(difficulty);
  }, [startGame]);

  const buy = useCallback((id: UpgradeId) => {
    const game = gameRef.current;
    if (!game) return;
    const updated = buyUpgrade(economy, id);
    if (updated) {
      game.economy = updated;
      saveEconomy(updated);
      setEconomy(updated);
    }
  }, [economy]);

  // Cleanup
  useEffect(() => {
    return () => {
      gameRef.current?.dispose();
      gameRef.current = null;
    };
  }, []);

  const inGame = !showMenu && !showShop;

  return (
    <div className="relative w-full h-full bg-black">
      {/* Game canvas sits at z-10; UI overlays (menu, HUD, nav) at z-20+
          so the pointer lock canvas never eats their clicks. */}
      <div ref={containerRef} className="absolute inset-0 z-10" />

      {inGame && <HUD data={hud} />}

      {showMenu && (
        <MainMenu
          bestTime={stats.bestTime}
          wins={stats.wins}
          deaths={stats.deaths}
          raidLevel={economy.raidLevel}
          money={economy.money}
          onStart={startGame}
        />
      )}

      {/* Top-left: back to the site's main menu */}
      <Link
        href="/"
        onClick={() => goMenu()}
        className="absolute left-4 top-4 z-50 pointer-events-auto flex items-center gap-2 border border-stone-700 bg-black/80 px-3 py-1.5 text-[11px] font-bold tracking-widest text-stone-300 hover:bg-stone-800 hover:text-white"
      >
        <span aria-hidden>←</span> МЕНЮ
      </Link>

      {paused && !showMenu && !showShop && (
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

      {showShop && result && (
        <Shop
          economy={economy}
          result={result}
          onBuy={buy}
          onNextRaid={nextRaid}
          onMenu={goMenu}
        />
      )}
    </div>
  );
}
