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
  const [hud, setHud] = useState({ stamina: 100, battery: 100, fuses: 0, fusesTotal: 0 });
  const [stats, setStats] = useState(() => loadGameState());

  const startGame = useCallback((difficulty: Difficulty) => {
    if (containerRef.current && !gameRef.current) {
      gameRef.current = new Game(containerRef.current);
    }

    const game = gameRef.current;
    if (!game) return;

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
    game.start();
  }, []);

  const restart = useCallback(() => {
    const difficulty = gameRef.current?.state.difficulty ?? "normal";
    startGame(difficulty);
  }, [startGame]);

  const goMenu = useCallback(() => {
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
