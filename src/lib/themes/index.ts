// ============================================================
// GAME THEMES — all theme definitions
// ============================================================

import type { GameTheme, GameThemeId } from "./types";
export type { GameTheme, GameThemeId } from "./types";

export const THEMES: Record<GameThemeId, GameTheme> = {
  // ---------- FOOTBALL DRAFT — tactical / match-day ----------
  "football-draft": {
    id: "football-draft",
    background: "linear-gradient(135deg, #0a3d0a 0%, #1a4d1a 40%, #0f2d0f 100%)",
    backgroundPattern:
      "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(16,185,129,0.05) 0%, transparent 50%)",
    primary: "#10b981",
    accent: "#fbbf24",
    card: "rgba(255,255,255,0.06)",
    cardBorder: "rgba(255,255,255,0.12)",
    text: "#f8fafc",
    textMuted: "rgba(255,255,255,0.6)",
    buttonBg: "linear-gradient(135deg, #059669, #047857)",
    buttonText: "#ffffff",
    buttonHover: "linear-gradient(135deg, #047857, #065f46)",
    headerAccent: "#34d399",
    fontStyle: "bold",
  },

  // ---------- GRID 9 — minimalist / newspaper / daily puzzle ----------
  "grid-9": {
    id: "grid-9",
    background: "linear-gradient(180deg, #faf9f6 0%, #f5f3ee 100%)",
    backgroundPattern:
      "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(0,0,0,0.015) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(0,0,0,0.015) 40px)",
    primary: "#1c1917",
    accent: "#059669",
    card: "rgba(255,255,255,0.9)",
    cardBorder: "rgba(0,0,0,0.08)",
    text: "#1c1917",
    textMuted: "rgba(28,25,23,0.55)",
    buttonBg: "#1c1917",
    buttonText: "#ffffff",
    buttonHover: "#44403c",
    headerAccent: "#059669",
    fontStyle: "medium",
  },

  // ---------- GUESS PLAYER — detective / mystery ----------
  "guess-player": {
    id: "guess-player",
    background: "linear-gradient(160deg, #0c0a09 0%, #1c1917 50%, #0c0a09 100%)",
    backgroundPattern:
      "radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.06) 0%, transparent 60%)",
    primary: "#fbbf24",
    accent: "#10b981",
    card: "rgba(255,255,255,0.04)",
    cardBorder: "rgba(251,191,36,0.2)",
    text: "#fafaf9",
    textMuted: "rgba(255,255,255,0.5)",
    buttonBg: "linear-gradient(135deg, #f59e0b, #d97706)",
    buttonText: "#0c0a09",
    buttonHover: "linear-gradient(135deg, #d97706, #b45309)",
    headerAccent: "#fbbf24",
    effect: "glow-gold",
    fontStyle: "bold",
  },

  // ---------- CAREER — transfer journey / dark stadium ----------
  career: {
    id: "career",
    background: "linear-gradient(180deg, #0a0a0a 0%, #171717 50%, #0a0a0a 100%)",
    backgroundPattern:
      "radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.04) 0%, transparent 50%)",
    primary: "#3b82f6",
    accent: "#f59e0b",
    card: "rgba(255,255,255,0.05)",
    cardBorder: "rgba(255,255,255,0.1)",
    text: "#f5f5f5",
    textMuted: "rgba(255,255,255,0.5)",
    buttonBg: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    buttonText: "#ffffff",
    buttonHover: "linear-gradient(135deg, #1d4ed8, #1e40af)",
    headerAccent: "#60a5fa",
    fontStyle: "medium",
  },

  // ---------- QUIZ — sports TV show / dark navy ----------
  quiz: {
    id: "quiz",
    background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
    backgroundPattern:
      "radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.08) 0%, transparent 50%)",
    primary: "#22d3ee",
    accent: "#4ade80",
    card: "rgba(255,255,255,0.06)",
    cardBorder: "rgba(255,255,255,0.1)",
    text: "#f1f5f9",
    textMuted: "rgba(255,255,255,0.55)",
    buttonBg: "linear-gradient(135deg, #0891b2, #0e7490)",
    buttonText: "#ffffff",
    buttonHover: "linear-gradient(135deg, #0e7490, #155e75)",
    headerAccent: "#22d3ee",
    effect: "stadium-lights",
    fontStyle: "bold",
  },

  // ---------- CS2 CASES — tactical / dark graphite / gold ----------
  "cs2-cases": {
    id: "cs2-cases",
    background: "linear-gradient(180deg, #09090b 0%, #18181b 50%, #09090b 100%)",
    backgroundPattern:
      "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.008) 10px, rgba(255,255,255,0.008) 11px)",
    primary: "#ffd700",
    accent: "#ff8c00",
    card: "rgba(255,255,255,0.03)",
    cardBorder: "rgba(255,255,255,0.08)",
    text: "#fafafa",
    textMuted: "rgba(255,255,255,0.45)",
    buttonBg: "linear-gradient(135deg, #ffd700, #ff8c00)",
    buttonText: "#09090b",
    buttonHover: "linear-gradient(135deg, #ff8c00, #ea580c)",
    headerAccent: "#ffd700",
    effect: "smoke",
    fontStyle: "bold",
  },

  // ---------- CS2 AIM — shooting range / HUD ----------
  "cs2-aim": {
    id: "cs2-aim",
    background: "#030303",
    backgroundPattern:
      "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(75,105,255,0.04) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(75,105,255,0.04) 40px)",
    primary: "#4b69ff",
    accent: "#8847ff",
    card: "rgba(0,0,0,0.6)",
    cardBorder: "rgba(75,105,255,0.2)",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.4)",
    buttonBg: "linear-gradient(135deg, #4b69ff, #8847ff)",
    buttonText: "#ffffff",
    buttonHover: "linear-gradient(135deg, #8847ff, #d32ce6)",
    headerAccent: "#4b69ff",
    fontStyle: "bold",
  },

  // ---------- CS2 HIGHER/LOWER — premium marketplace ----------
  "cs2-higher-lower": {
    id: "cs2-higher-lower",
    background: "linear-gradient(180deg, #0a0a0a 0%, #111113 50%, #0a0a0a 100%)",
    backgroundPattern:
      "radial-gradient(ellipse at 50% 50%, rgba(255,215,0,0.03) 0%, transparent 60%)",
    primary: "#ffd700",
    accent: "#4b69ff",
    card: "rgba(255,255,255,0.04)",
    cardBorder: "rgba(255,215,0,0.15)",
    text: "#fafafa",
    textMuted: "rgba(255,255,255,0.45)",
    buttonBg: "linear-gradient(135deg, #ffd700, #f59e0b)",
    buttonText: "#0a0a0a",
    buttonHover: "linear-gradient(135deg, #f59e0b, #d97706)",
    headerAccent: "#ffd700",
    fontStyle: "bold",
  },

  // ---------- CS2 MAP GUESS — dark tactical / steel / cyan ----------
  "cs2-map-guess": {
    id: "cs2-map-guess",
    background: "linear-gradient(180deg, #0b0d12 0%, #10141c 50%, #0b0d12 100%)",
    backgroundPattern:
      "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(34,211,238,0.04) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(34,211,238,0.04) 40px)",
    primary: "#22d3ee",
    accent: "#f97316",
    card: "rgba(255,255,255,0.04)",
    cardBorder: "rgba(34,211,238,0.2)",
    text: "#f1f5f9",
    textMuted: "rgba(255,255,255,0.5)",
    buttonBg: "linear-gradient(135deg, #0891b2, #0e7490)",
    buttonText: "#ffffff",
    buttonHover: "linear-gradient(135deg, #0e7490, #155e75)",
    headerAccent: "#22d3ee",
    fontStyle: "bold",
  },

  // ---------- REACTION TEST — arcade / minimal dark ----------
  "reaction-test": {
    id: "reaction-test",
    background: "linear-gradient(180deg, #07090c 0%, #0d1117 50%, #07090c 100%)",
    backgroundPattern:
      "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.025) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.025) 40px)",
    primary: "#4ade80",
    accent: "#ef4444",
    card: "rgba(255,255,255,0.05)",
    cardBorder: "rgba(255,255,255,0.1)",
    text: "#f8fafc",
    textMuted: "rgba(255,255,255,0.5)",
    buttonBg: "linear-gradient(135deg, #16a34a, #15803d)",
    buttonText: "#ffffff",
    buttonHover: "linear-gradient(135deg, #15803d, #166534)",
    headerAccent: "#4ade80",
    fontStyle: "bold",
  },

  // ---------- AKINATOR — mystical / deep violet ----------
  akinator: {
    id: "akinator",
    background: "linear-gradient(180deg, #0c0214 0%, #1a0533 50%, #0c0214 100%)",
    backgroundPattern:
      "radial-gradient(ellipse at 50% 30%, rgba(167,139,250,0.08) 0%, transparent 50%), radial-gradient(ellipse at 30% 70%, rgba(139,92,246,0.05) 0%, transparent 40%)",
    primary: "#a78bfa",
    accent: "#7c3aed",
    card: "rgba(255,255,255,0.05)",
    cardBorder: "rgba(167,139,250,0.2)",
    text: "#faf5ff",
    textMuted: "rgba(255,255,255,0.5)",
    buttonBg: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    buttonText: "#ffffff",
    buttonHover: "linear-gradient(135deg, #6d28d9, #5b21b6)",
    headerAccent: "#c4b5fd",
    effect: "stars",
    fontStyle: "medium",
  },

  // ---------- GEOGUESSR — travel / exploration / blue-green ----------
  geoguessr: {
    id: "geoguessr",
    background: "linear-gradient(180deg, #0c1a2e 0%, #12283f 50%, #0c1a2e 100%)",
    backgroundPattern:
      "radial-gradient(ellipse at 80% 20%, rgba(16,185,129,0.06) 0%, transparent 40%), radial-gradient(ellipse at 20% 80%, rgba(59,130,246,0.05) 0%, transparent 40%)",
    primary: "#10b981",
    accent: "#3b82f6",
    card: "rgba(255,255,255,0.06)",
    cardBorder: "rgba(255,255,255,0.1)",
    text: "#f0fdfa",
    textMuted: "rgba(255,255,255,0.55)",
    buttonBg: "linear-gradient(135deg, #059669, #047857)",
    buttonText: "#ffffff",
    buttonHover: "linear-gradient(135deg, #047857, #065f46)",
    headerAccent: "#34d399",
    fontStyle: "medium",
  },

  // ---------- FLAPPY BIRD — neon night sky / arcade ----------
  "flappy-bird": {
    id: "flappy-bird",
    background:
      "linear-gradient(180deg, #05090f 0%, #0a1626 45%, #08131f 100%)",
    backgroundPattern:
      "radial-gradient(circle at 15% 20%, rgba(34,211,238,0.05) 0%, transparent 45%), radial-gradient(circle at 85% 70%, rgba(56,189,248,0.05) 0%, transparent 45%)",
    primary: "#22d3ee",
    accent: "#fbbf24",
    card: "rgba(255,255,255,0.05)",
    cardBorder: "rgba(255,255,255,0.12)",
    text: "#f0f9ff",
    textMuted: "rgba(255,255,255,0.6)",
    buttonBg: "linear-gradient(135deg, #06b6d4, #0891b2)",
    buttonText: "#ffffff",
    buttonHover: "linear-gradient(135deg, #0891b2, #0e7490)",
    headerAccent: "#67e8f9",
    fontStyle: "bold",
  },

  // ---------- LAST SHIFT — horror / industrial dark ----------
  "last-shift": {
    id: "last-shift",
    background:
      "linear-gradient(180deg, #060607 0%, #0b0d0f 45%, #101214 100%)",
    backgroundPattern:
      "radial-gradient(circle at 20% 15%, rgba(217,119,6,0.06) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(127,29,29,0.07) 0%, transparent 45%)",
    primary: "#d97706",
    accent: "#991b1b",
    card: "rgba(255,255,255,0.04)",
    cardBorder: "rgba(255,255,255,0.10)",
    text: "#f5f5f4",
    textMuted: "rgba(255,255,255,0.55)",
    buttonBg: "linear-gradient(135deg, #b45309, #92400e)",
    buttonText: "#ffffff",
    buttonHover: "linear-gradient(135deg, #92400e, #78350f)",
    headerAccent: "#f59e0b",
    fontStyle: "bold",
  },

  // ---------- BACKROOMS: LEVEL 0 — liminal horror / VHS tape ----------
  backrooms: {
    id: "backrooms",
    background:
      "linear-gradient(180deg, #0a0905 0%, #14120b 50%, #0a0905 100%)",
    backgroundPattern:
      "radial-gradient(ellipse at 50% 0%, rgba(255,225,150,0.05) 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(120,100,40,0.04) 0%, transparent 45%)",
    primary: "#f5deb3",
    accent: "#fbbf24",
    card: "rgba(0,0,0,0.5)",
    cardBorder: "rgba(255,225,170,0.18)",
    text: "#faf5e8",
    textMuted: "rgba(255,235,200,0.55)",
    buttonBg: "linear-gradient(135deg, #f5deb3, #d4a94a)",
    buttonText: "#0a0905",
    buttonHover: "linear-gradient(135deg, #d4a94a, #a97f2e)",
    headerAccent: "#f5deb3",
    fontStyle: "bold",
  },

  // ---------- THE MAZE — dark horror / survival ----------
  maze: {
    id: "maze",
    background:
      "linear-gradient(180deg, #050505 0%, #0a0a0f 50%, #050505 100%)",
    backgroundPattern:
      "radial-gradient(circle at 50% 100%, rgba(220,38,38,0.04) 0%, transparent 50%)",
    primary: "#dc2626",
    accent: "#f59e0b",
    card: "rgba(255,255,255,0.03)",
    cardBorder: "rgba(220,38,38,0.15)",
    text: "#f5f5f4",
    textMuted: "rgba(255,255,255,0.5)",
    buttonBg: "linear-gradient(135deg, #dc2626, #991b1b)",
    buttonText: "#ffffff",
    buttonHover: "linear-gradient(135deg, #991b1b, #7f1d1d)",
    headerAccent: "#f87171",
    fontStyle: "bold",
  },

  // ---------- NEUTRAL — default site (cream) ----------
  neutral: {
    id: "neutral",
    background: "transparent",
    primary: "#1c1917",
    accent: "#059669",
    card: "rgba(255,255,255,0.7)",
    cardBorder: "rgba(0,0,0,0.08)",
    text: "#1c1917",
    textMuted: "rgba(28,25,23,0.55)",
    buttonBg: "#1c1917",
    buttonText: "#ffffff",
    buttonHover: "#44403c",
    headerAccent: "#059669",
    fontStyle: "medium",
  },
};

export function getTheme(id: GameThemeId): GameTheme {
  return THEMES[id] ?? THEMES.neutral;
}
