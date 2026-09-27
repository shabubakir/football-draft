"use client";

// ============================================================
// GAME SHELL — applies a visual theme to a game page
// ============================================================

import { type ReactNode } from "react";
import { getTheme, type GameThemeId } from "@/lib/themes";
import { Nav } from "./nav";

interface GameShellProps {
  theme: GameThemeId;
  /** Game-specific header (badge + title + subtitle) */
  header?: {
    badge: string;
    title: string;
    subtitle?: string;
  };
  children: ReactNode;
  /** Max width for content (default: max-w-5xl) */
  maxWidth?: string;
}

export default function GameShell({
  theme: themeId,
  header,
  children,
  maxWidth = "max-w-5xl",
}: GameShellProps) {
  const theme = getTheme(themeId);
  const isDark =
    themeId !== "grid-9" && themeId !== "neutral";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: theme.background,
        color: theme.text,
      }}
    >
      {/* Background pattern overlay */}
      {theme.backgroundPattern && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ background: theme.backgroundPattern }}
        />
      )}

      {/* Effect layer (stars, smoke, etc.) */}
      {theme.effect === "stars" && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white animate-pulse"
              style={{
                width: `${2 + (i % 3)}px`,
                height: `${2 + (i % 3)}px`,
                left: `${(i * 37) % 100}%`,
                top: `${(i * 53) % 100}%`,
                opacity: 0.1 + (i % 5) * 0.06,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + (i % 3)}s`,
              }}
            />
          ))}
        </div>
      )}

      {theme.effect === "smoke" && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 30% 80%, rgba(255,255,255,0.015) 0%, transparent 40%), radial-gradient(ellipse at 70% 20%, rgba(255,140,0,0.02) 0%, transparent 35%)",
          }}
        />
      )}

      {theme.effect === "stadium-lights" && (
        <div
          className="fixed inset-x-0 top-0 h-64 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% -20%, rgba(34,211,238,0.12) 0%, transparent 60%)",
          }}
        />
      )}

      {/* Nav (adapted for dark themes) */}
      <Nav dark={isDark} />

      {/* Game header */}
      {header && (
        <div className="relative z-10 pt-8 pb-4 px-4 sm:px-6">
          <div className={`w-full ${maxWidth} mx-auto`}>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase mb-3"
              style={{
                background: `${theme.headerAccent}18`,
                color: theme.headerAccent,
                border: `1px solid ${theme.headerAccent}30`,
              }}
            >
              {header.badge}
            </div>
            <h1
              className="text-2xl sm:text-4xl font-black tracking-tight"
              style={{ color: theme.text }}
            >
              {header.title}
            </h1>
            {header.subtitle && (
              <p
                className="mt-1 text-sm sm:text-base"
                style={{ color: theme.textMuted }}
              >
                {header.subtitle}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="relative z-10 flex-1 w-full px-4 sm:px-6 py-4 sm:py-6">
        <div className={`w-full ${maxWidth} mx-auto`}>{children}</div>
      </main>
    </div>
  );
}
