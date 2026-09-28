// ============================================================
// CS2 MAP GUESS — data & scoring
// ============================================================
// 8 карт, локации с нормализованными координатами (0–1).
// Coords are in "top-down minimap" space: x→right, y→down.
// ============================================================

export type Difficulty = "easy" | "medium" | "hard";
export type GameMode = "guess" | "where";

export interface MapLocation {
  id: string;
  map: string;
  /** Short location name shown as feedback */
  location: string;
  difficulty: Difficulty;
  /** Normalized x (0–1) in minimap space */
  x: number;
  /** Normalized y (0–1) in minimap space */
  y: number;
  /**
   * SVG path / rect descriptor for the "screenshot" placeholder.
   * Used to render a stylized top-down snippet of the map area.
   * Each entry is an array of primitive shapes.
   */
  shapes: MapShape[];
  /** Accent color for the location highlight */
  accent: string;
}

export type MapShape =
  | { type: "rect"; x: number; y: number; w: number; h: number; fill: string; rx?: number }
  | { type: "circle"; cx: number; cy: number; r: number; fill: string; stroke?: string; width?: number }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; width: number }
  | { type: "path"; d: string; fill?: string; stroke?: string; width?: number }
  | { type: "text"; x: number; y: number; text: string; size: number; fill: string; anchor?: "start" | "middle" | "end" };

export const MAP_NAMES = [
  "MIRAGE",
  "DUST 2",
  "INFERNO",
  "NUKE",
  "ANCIENT",
  "ANUBIS",
  "VERTIGO",
  "OVERPASS",
] as const;

export type MapName = (typeof MAP_NAMES)[number];

// ---------- Scoring: Where Exactly mode ----------
// Distance in normalized units → points
export function scoreDistance(dist: number): number {
  if (dist <= 0.05) return 1000;
  if (dist <= 0.15) return 800;
  if (dist <= 0.30) return 600;
  if (dist <= 0.50) return 400;
  return 200;
}

export function distanceBetween(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

// ---------- Guess the Map scoring ----------
export function scoreCorrect(): number {
  return 100;
}

// ---------- Round config ----------
export const TOTAL_ROUNDS = 10;
export const WHERE_TOTAL_ROUNDS = 10;

// ---------- Location bank ----------
// Each map has 3–5 locations. Coordinates are approximate top-down
// positions on the canonical minimap layout.

function loc(
  id: string,
  map: string,
  location: string,
  difficulty: Difficulty,
  x: number,
  y: number,
  shapes: MapShape[],
  accent: string
): MapLocation {
  return { id, map, location, difficulty, x, y, shapes, accent };
}

// Helper for building stylized "screenshot" shapes
function floorGrid(x: number, y: number, w: number, h: number, color: string): MapShape[] {
  return [
    { type: "rect", x, y, w, h, fill: "#1a1a2e", rx: 2 },
    { type: "line", x1: x, y1: y + h / 2, x2: x + w, y2: y + h / 2, stroke: "#2a2a4a", width: 1 },
    { type: "line", x1: x + w / 2, y1: y, x2: x + w / 2, y2: y + h, stroke: "#2a2a4a", width: 1 },
  ];
}

export const LOCATIONS: MapLocation[] = [
  // ===== MIRAGE ===== (purple/blue Egyptian theme)
  loc(
    "mirage_a_site",
    "MIRAGE",
    "A Site",
    "easy",
    0.72,
    0.35,
    [
      // Distinctive purple pyramid shape (triangle-like)
      { type: "rect", x: 0.62, y: 0.26, w: 0.28, h: 0.2, fill: "#3b1a5c", rx: 2 },
      { type: "rect", x: 0.66, y: 0.29, w: 0.1, h: 0.09, fill: "#4d2775" },
      { type: "rect", x: 0.79, y: 0.29, w: 0.08, h: 0.08, fill: "#5d3590" },
      // Egyptian column markers (distinctive to Mirage)
      { type: "circle", cx: 0.68, cy: 0.42, r: 0.012, fill: "#a78bfa" },
      { type: "circle", cx: 0.72, cy: 0.42, r: 0.012, fill: "#a78bfa" },
      { type: "circle", cx: 0.76, cy: 0.42, r: 0.012, fill: "#a78bfa" },
      { type: "text", x: 0.76, y: 0.22, text: "A SITE", size: 6, fill: "#c4b5fd", anchor: "middle" },
    ],
    "#a78bfa"
  ),
  loc(
    "mirage_b_site",
    "MIRAGE",
    "B Site",
    "easy",
    0.28,
    0.62,
    [
      // Blue-teal palette (distinctive to Mirage B)
      { type: "rect", x: 0.16, y: 0.53, w: 0.26, h: 0.22, fill: "#1e3a5f", rx: 2 },
      { type: "rect", x: 0.19, y: 0.56, w: 0.09, h: 0.09, fill: "#2d5a7a" },
      { type: "rect", x: 0.31, y: 0.58, w: 0.09, h: 0.11, fill: "#2d5a7a" },
      // Water/river marker (Mirage has distinctive water areas)
      { type: "line", x1: 0.16, y1: 0.76, x2: 0.42, y2: 0.76, stroke: "#3b82f6", width: 0.008 },
      { type: "text", x: 0.29, y: 0.5, text: "B SITE", size: 6, fill: "#93c5fd", anchor: "middle" },
    ],
    "#60a5fa"
  ),
  loc(
    "mirage_mid",
    "MIRAGE",
    "Mid",
    "medium",
    0.5,
    0.48,
    [
      // Purple-slate gradient (Mirage mid)
      { type: "rect", x: 0.36, y: 0.41, w: 0.28, h: 0.16, fill: "#2d2d4e", rx: 2 },
      { type: "rect", x: 0.39, y: 0.44, w: 0.22, h: 0.1, fill: "#3d3d5e" },
      // Egyptian archway pattern (3 arches)
      { type: "line", x1: 0.4, y1: 0.49, x2: 0.4, y2: 0.55, stroke: "#7c6bb5", width: 0.006 },
      { type: "line", x1: 0.5, y1: 0.49, x2: 0.5, y2: 0.55, stroke: "#7c6bb5", width: 0.006 },
      { type: "line", x1: 0.6, y1: 0.49, x2: 0.6, y2: 0.55, stroke: "#7c6bb5", width: 0.006 },
      { type: "text", x: 0.5, y: 0.38, text: "MID", size: 6, fill: "#a5a5c5", anchor: "middle" },
    ],
    "#94a3b8"
  ),
  loc(
    "mirage_connector",
    "MIRAGE",
    "Connector",
    "hard",
    0.58,
    0.42,
    [
      { type: "rect", x: 0.52, y: 0.36, w: 0.14, h: 0.14, fill: "#1e293b", rx: 1 },
      { type: "rect", x: 0.55, y: 0.39, w: 0.08, h: 0.08, fill: "#334155" },
      { type: "text", x: 0.59, y: 0.34, text: "CONNECTOR", size: 5, fill: "#f59e0b", anchor: "middle" },
    ],
    "#f59e0b"
  ),
  loc(
    "mirage_apartments",
    "MIRAGE",
    "B Apartments",
    "medium",
    0.15,
    0.45,
    [
      { type: "rect", x: 0.08, y: 0.38, w: 0.14, h: 0.16, fill: "#2d2b4e", rx: 1 },
      { type: "rect", x: 0.1, y: 0.4, w: 0.06, h: 0.05, fill: "#4a4572" },
      { type: "rect", x: 0.17, y: 0.4, w: 0.03, h: 0.05, fill: "#4a4572" },
      { type: "rect", x: 0.1, y: 0.47, w: 0.06, h: 0.05, fill: "#4a4572" },
      { type: "text", x: 0.15, y: 0.36, text: "APARTMENTS", size: 5, fill: "#c084fc", anchor: "middle" },
    ],
    "#c084fc"
  ),

  // ===== DUST 2 ===== (sand/desert theme - warm beige/yellow)
  loc(
    "dust2_a_site",
    "DUST 2",
    "A Site",
    "easy",
    0.75,
    0.3,
    [
      // Warm sand tones (distinctive to Dust2)
      { type: "rect", x: 0.66, y: 0.23, w: 0.26, h: 0.16, fill: "#6b5a3b", rx: 2 },
      { type: "rect", x: 0.69, y: 0.26, w: 0.09, h: 0.09, fill: "#7d6b4a" },
      { type: "rect", x: 0.81, y: 0.26, w: 0.07, h: 0.07, fill: "#8d7b5a" },
      // Sand dune lines (distinctive to Dust2)
      { type: "line", x1: 0.66, y1: 0.41, x2: 0.92, y2: 0.41, stroke: "#d4a574", width: 0.008 },
      { type: "line", x1: 0.66, y1: 0.43, x2: 0.92, y2: 0.43, stroke: "#c49a6a", width: 0.006 },
      { type: "text", x: 0.79, y: 0.2, text: "A SITE", size: 6, fill: "#fde68a", anchor: "middle" },
    ],
    "#fbbf24"
  ),
  loc(
    "dust2_b_site",
    "DUST 2",
    "B Site",
    "easy",
    0.25,
    0.65,
    [
      // Olive-green sand (Dust2 B site has more vegetation)
      { type: "rect", x: 0.16, y: 0.57, w: 0.24, h: 0.2, fill: "#5a6b3b", rx: 2 },
      { type: "rect", x: 0.19, y: 0.6, w: 0.09, h: 0.09, fill: "#6a7b4a" },
      // Palm tree markers (distinctive to Dust2)
      { type: "line", x1: 0.32, y1: 0.62, x2: 0.32, y2: 0.72, stroke: "#8b7355", width: 0.008 },
      { type: "circle", cx: 0.32, cy: 0.62, r: 0.015, fill: "#4ade80" },
      { type: "text", x: 0.28, y: 0.54, text: "B SITE", size: 6, fill: "#86efac", anchor: "middle" },
    ],
    "#4ade80"
  ),
  loc(
    "dust2_mid",
    "DUST 2",
    "Mid Doors",
    "medium",
    0.5,
    0.5,
    [
      // Sandstone doors (distinctive Dust2 mid)
      { type: "rect", x: 0.41, y: 0.43, w: 0.18, h: 0.14, fill: "#6b5f4a", rx: 1 },
      { type: "rect", x: 0.44, y: 0.46, w: 0.12, h: 0.08, fill: "#7d705a" },
      // Door frame lines
      { type: "line", x1: 0.44, y1: 0.46, x2: 0.44, y2: 0.54, stroke: "#8d7b65", width: 0.005 },
      { type: "line", x1: 0.56, y1: 0.46, x2: 0.56, y2: 0.54, stroke: "#8d7b65", width: 0.005 },
      { type: "text", x: 0.5, y: 0.4, text: "MID DOORS", size: 5, fill: "#fcd34d", anchor: "middle" },
    ],
    "#eab308"
  ),
  loc(
    "dust2_long",
    "DUST 2",
    "Long A",
    "hard",
    0.5,
    0.2,
    [
      { type: "rect", x: 0.35, y: 0.12, w: 0.3, h: 0.12, fill: "#3b352b", rx: 1 },
      { type: "rect", x: 0.38, y: 0.14, w: 0.24, h: 0.08, fill: "#4b453b" },
      { type: "text", x: 0.5, y: 0.1, text: "LONG A", size: 5, fill: "#f97316", anchor: "middle" },
    ],
    "#f97316"
  ),
  loc(
    "dust2_short",
    "DUST 2",
    "Short A",
    "hard",
    0.82,
    0.55,
    [
      { type: "rect", x: 0.76, y: 0.48, w: 0.14, h: 0.16, fill: "#3b2b2b", rx: 1 },
      { type: "rect", x: 0.79, y: 0.5, w: 0.08, h: 0.1, fill: "#4b3b3b" },
      { type: "text", x: 0.83, y: 0.46, text: "SHORT", size: 5, fill: "#ef4444", anchor: "middle" },
    ],
    "#ef4444"
  ),

  // ===== INFERNO ===== (red-brown Italian Mediterranean theme)
  loc(
    "inferno_a_site",
    "INFERNO",
    "A Site",
    "easy",
    0.7,
    0.35,
    [
      // Warm red-brown (Inferno A)
      { type: "rect", x: 0.61, y: 0.28, w: 0.24, h: 0.16, fill: "#5c2e2e", rx: 2 },
      { type: "rect", x: 0.64, y: 0.31, w: 0.09, h: 0.09, fill: "#6d3e3e" },
      // Italian archway (distinctive to Inferno)
      { type: "circle", cx: 0.73, cy: 0.45, r: 0.035, fill: "none", stroke: "#f87171", width: 0.006 },
      { type: "text", x: 0.73, y: 0.25, text: "A SITE", size: 6, fill: "#fca5a5", anchor: "middle" },
    ],
    "#f87171"
  ),
  loc(
    "inferno_b_site",
    "INFERNO",
    "B Site",
    "medium",
    0.3,
    0.6,
    [
      // Cool blue-grey (Inferno B - contrast to A)
      { type: "rect", x: 0.21, y: 0.53, w: 0.22, h: 0.18, fill: "#2e4a5c", rx: 2 },
      { type: "rect", x: 0.24, y: 0.56, w: 0.09, h: 0.09, fill: "#3e5a6c" },
      // Vineyard pattern (Inferno has Italian vineyard elements)
      { type: "line", x1: 0.21, y1: 0.72, x2: 0.43, y2: 0.72, stroke: "#4ade80", width: 0.006 },
      { type: "line", x1: 0.21, y1: 0.74, x2: 0.43, y2: 0.74, stroke: "#38bdf8", width: 0.006 },
      { type: "text", x: 0.32, y: 0.5, text: "B SITE", size: 6, fill: "#7dd3fc", anchor: "middle" },
    ],
    "#38bdf8"
  ),
  loc(
    "inferno_banana",
    "INFERNO",
    "Banana",
    "hard",
    0.5,
    0.55,
    [
      // Curved banana corridor (yellow-green)
      { type: "rect", x: 0.41, y: 0.49, w: 0.18, h: 0.12, fill: "#5c5a2e", rx: 4 },
      { type: "rect", x: 0.44, y: 0.51, w: 0.12, h: 0.08, fill: "#6d6b3e" },
      // Banana curve (arced line)
      { type: "path", d: "M0.41,0.49 Q0.5,0.45 0.59,0.49", fill: "none", stroke: "#facc15", width: 0.008 },
      { type: "text", x: 0.5, y: 0.46, text: "BANANA", size: 5, fill: "#fde047", anchor: "middle" },
    ],
    "#facc15"
  ),
  loc(
    "inferno_mid",
    "INFERNO",
    "Mid / Doors",
    "medium",
    0.45,
    0.42,
    [
      { type: "rect", x: 0.35, y: 0.35, w: 0.2, h: 0.14, fill: "#3b3545", rx: 1 },
      { type: "rect", x: 0.38, y: 0.38, w: 0.14, h: 0.08, fill: "#4b4555" },
      { type: "text", x: 0.45, y: 0.33, text: "MID", size: 5, fill: "#a78bfa", anchor: "middle" },
    ],
    "#a78bfa"
  ),

  // ===== NUKE ===== (cool blue-grey, nuclear/factory theme)
  loc(
    "nuke_a_site",
    "NUKE",
    "A Site",
    "easy",
    0.7,
    0.4,
    [
      // Cold steel blue (Nuke A)
      { type: "rect", x: 0.61, y: 0.33, w: 0.22, h: 0.16, fill: "#1e3e5c", rx: 2 },
      { type: "rect", x: 0.64, y: 0.36, w: 0.09, h: 0.09, fill: "#2e4e6c" },
      // Industrial pipe markers (Nuke is a nuclear facility)
      { type: "circle", cx: 0.7, cy: 0.5, r: 0.02, fill: "#22d3ee" },
      { type: "circle", cx: 0.7, cy: 0.5, r: 0.012, fill: "#67e8f9" },
      { type: "text", x: 0.72, y: 0.3, text: "A SITE", size: 6, fill: "#a5f3fc", anchor: "middle" },
    ],
    "#22d3ee"
  ),
  loc(
    "nuke_b_site",
    "NUKE",
    "B Site",
    "medium",
    0.3,
    0.55,
    [
      // Warm rust-orange (Nuke B - contrast to cold A)
      { type: "rect", x: 0.21, y: 0.49, w: 0.2, h: 0.16, fill: "#5c3e1e", rx: 2 },
      { type: "rect", x: 0.24, y: 0.52, w: 0.08, h: 0.09, fill: "#6c4e2e" },
      // Radiation warning stripes (Nuke theme)
      { type: "line", x1: 0.21, y1: 0.66, x2: 0.25, y2: 0.66, stroke: "#fb923c", width: 0.01 },
      { type: "line", x1: 0.35, y1: 0.66, x2: 0.39, y2: 0.66, stroke: "#fbbf24", width: 0.01 },
      { type: "text", x: 0.31, y: 0.46, text: "B SITE", size: 6, fill: "#fed7aa", anchor: "middle" },
    ],
    "#fb923c"
  ),
  loc(
    "nuke_roof",
    "NUKE",
    "Roof",
    "hard",
    0.5,
    0.15,
    [
      // Dark industrial roof
      { type: "rect", x: 0.36, y: 0.09, w: 0.28, h: 0.1, fill: "#2a2a3e", rx: 1 },
      { type: "rect", x: 0.39, y: 0.11, w: 0.22, h: 0.06, fill: "#3a3a4e" },
      // Helicopter pad marker (Nuke roof has heli)
      { type: "circle", cx: 0.5, cy: 0.14, r: 0.025, fill: "none", stroke: "#60a5fa", width: 0.004 },
      { type: "line", x1: 0.48, y1: 0.14, x2: 0.52, y2: 0.14, stroke: "#60a5fa", width: 0.003 },
      { type: "line", x1: 0.5, y1: 0.12, x2: 0.5, y2: 0.16, stroke: "#60a5fa", width: 0.003 },
      { type: "text", x: 0.5, y: 0.06, text: "ROOF", size: 5, fill: "#93c5fd", anchor: "middle" },
    ],
    "#60a5fa"
  ),
  loc(
    "nuke_gate",
    "NUKE",
    "Gate",
    "hard",
    0.5,
    0.7,
    [
      { type: "rect", x: 0.42, y: 0.64, w: 0.16, h: 0.14, fill: "#3e1a2a", rx: 1 },
      { type: "rect", x: 0.45, y: 0.67, w: 0.1, h: 0.08, fill: "#4e2a3a" },
      { type: "text", x: 0.5, y: 0.62, text: "GATE", size: 5, fill: "#f472b6", anchor: "middle" },
    ],
    "#f472b6"
  ),

  // ===== ANCIENT ===== (green-blue Norse/mythological theme)
  loc(
    "ancient_a_site",
    "ANCIENT",
    "A Site",
    "easy",
    0.68,
    0.38,
    [
      // Vibrant green (Ancient A - distinctive)
      { type: "rect", x: 0.59, y: 0.31, w: 0.22, h: 0.16, fill: "#2e5c3e", rx: 2 },
      { type: "rect", x: 0.62, y: 0.34, w: 0.09, h: 0.09, fill: "#3e6c4e" },
      // Norse rune pattern (Ancient has Norse mythology)
      { type: "path", d: "M0.72,0.47 L0.74,0.47 L0.74,0.52 L0.72,0.52", fill: "none", stroke: "#84cc16", width: 0.004 },
      { type: "text", x: 0.7, y: 0.28, text: "A SITE", size: 6, fill: "#bef264", anchor: "middle" },
    ],
    "#84cc16"
  ),
  loc(
    "ancient_b_site",
    "ANCIENT",
    "B Site",
    "easy",
    0.32,
    0.58,
    [
      // Deep blue (Ancient B - cool contrast)
      { type: "rect", x: 0.23, y: 0.51, w: 0.2, h: 0.16, fill: "#1e3e5c", rx: 2 },
      { type: "rect", x: 0.26, y: 0.54, w: 0.09, h: 0.09, fill: "#2e4e6c" },
      // Ice/frost pattern (Ancient has icy areas)
      { type: "line", x1: 0.23, y1: 0.68, x2: 0.43, y2: 0.68, stroke: "#60a5fa", width: 0.008 },
      { type: "line", x1: 0.33, y1: 0.68, x2: 0.33, y2: 0.7, stroke: "#93c5fd", width: 0.004 },
      { type: "text", x: 0.33, y: 0.48, text: "B SITE", size: 6, fill: "#93c5fd", anchor: "middle" },
    ],
    "#38bdf8"
  ),
  loc(
    "ancient_mid",
    "ANCIENT",
    "Mid / Temple",
    "medium",
    0.5,
    0.45,
    [
      { type: "rect", x: 0.4, y: 0.38, w: 0.2, h: 0.16, fill: "#4e3e2a", rx: 1 },
      { type: "rect", x: 0.43, y: 0.41, w: 0.14, h: 0.1, fill: "#5e4e3a" },
      { type: "text", x: 0.5, y: 0.36, text: "TEMPLE", size: 5, fill: "#fbbf24", anchor: "middle" },
    ],
    "#fbbf24"
  ),

  // ===== ANUBIS ===== (purple-gold Egyptian theme)
  loc(
    "anubis_a_site",
    "ANUBIS",
    "A Site",
    "easy",
    0.72,
    0.32,
    [
      // Deep purple (Anubis A)
      { type: "rect", x: 0.63, y: 0.25, w: 0.24, h: 0.16, fill: "#3e1e5c", rx: 2 },
      { type: "rect", x: 0.66, y: 0.28, w: 0.09, h: 0.09, fill: "#4e2e6c" },
      // Golden ankh symbol (Egyptian)
      { type: "circle", cx: 0.75, cy: 0.44, r: 0.02, fill: "none", stroke: "#fbbf24", width: 0.004 },
      { type: "line", x1: 0.75, y1: 0.44, x2: 0.75, y2: 0.48, stroke: "#fbbf24", width: 0.004 },
      { type: "text", x: 0.75, y: 0.22, text: "A SITE", size: 6, fill: "#d8b4fe", anchor: "middle" },
    ],
    "#c084fc"
  ),
  loc(
    "anubis_b_site",
    "ANUBIS",
    "B Site",
    "medium",
    0.28,
    0.6,
    [
      // Dark green (Anubis B)
      { type: "rect", x: 0.19, y: 0.53, w: 0.2, h: 0.16, fill: "#1e4e3e", rx: 2 },
      { type: "rect", x: 0.22, y: 0.56, w: 0.09, h: 0.09, fill: "#2e5e4e" },
      // Pyramid outline (Anubis has pyramids)
      { type: "path", d: "M0.29,0.7 L0.33,0.62 L0.37,0.7", fill: "none", stroke: "#fbbf24", width: 0.004 },
      { type: "text", x: 0.29, y: 0.5, text: "B SITE", size: 6, fill: "#6ee7b7", anchor: "middle" },
    ],
    "#4ade80"
  ),
  loc(
    "anubis_mid",
    "ANUBIS",
    "Mid / Pyramid",
    "medium",
    0.5,
    0.45,
    [
      { type: "rect", x: 0.4, y: 0.38, w: 0.2, h: 0.16, fill: "#4e3e2e", rx: 1 },
      { type: "circle", cx: 0.5, cy: 0.46, r: 0.04, fill: "#5e4e3e" },
      { type: "text", x: 0.5, y: 0.36, text: "PYRAMID", size: 5, fill: "#fbbf24", anchor: "middle" },
    ],
    "#fbbf24"
  ),

  // ===== VERTIGO ===== (cold grey-blue, high-altitude/cave theme)
  loc(
    "vertigo_a_site",
    "VERTIGO",
    "A Site",
    "easy",
    0.65,
    0.4,
    [
      // Cool slate (Vertigo A)
      { type: "rect", x: 0.56, y: 0.33, w: 0.2, h: 0.16, fill: "#2e2e4e", rx: 2 },
      { type: "rect", x: 0.59, y: 0.36, w: 0.09, h: 0.09, fill: "#3e3e5e" },
      // Height/altitude lines (Vertigo is high up)
      { type: "line", x1: 0.56, y1: 0.5, x2: 0.76, y2: 0.5, stroke: "#818cf8", width: 0.004 },
      { type: "line", x1: 0.56, y1: 0.52, x2: 0.76, y2: 0.52, stroke: "#a5b4fc", width: 0.003 },
      { type: "text", x: 0.66, y: 0.3, text: "A SITE", size: 6, fill: "#c7d2fe", anchor: "middle" },
    ],
    "#818cf8"
  ),
  loc(
    "vertigo_b_site",
    "VERTIGO",
    "B Site",
    "medium",
    0.35,
    0.55,
    [
      { type: "rect", x: 0.25, y: 0.48, w: 0.2, h: 0.18, fill: "#2e4e3e", rx: 2 },
      { type: "rect", x: 0.28, y: 0.51, w: 0.1, h: 0.1, fill: "#3e5e4e" },
      { type: "text", x: 0.35, y: 0.46, text: "B SITE", size: 6, fill: "#34d399", anchor: "middle" },
    ],
    "#34d399"
  ),
  loc(
    "vertigo_cave",
    "VERTIGO",
    "Cave",
    "hard",
    0.5,
    0.7,
    [
      // Dark cave (Vertigo has a cave)
      { type: "circle", cx: 0.5, cy: 0.7, r: 0.08, fill: "#0a1a2e" },
      { type: "circle", cx: 0.5, cy: 0.7, r: 0.05, fill: "#1a2e4e" },
      // Cave entrance (arch)
      { type: "path", d: "M0.46,0.74 Q0.5,0.68 0.54,0.74", fill: "none", stroke: "#22d3ee", width: 0.006 },
      { type: "text", x: 0.5, y: 0.6, text: "CAVE", size: 5, fill: "#67e8f9", anchor: "middle" },
    ],
    "#22d3ee"
  ),

  // ===== OVERPASS ===== (industrial grey-green, factory theme)
  loc(
    "overpass_a_site",
    "OVERPASS",
    "A Site",
    "easy",
    0.68,
    0.35,
    [
      // Industrial olive (Overpass A)
      { type: "rect", x: 0.59, y: 0.28, w: 0.22, h: 0.16, fill: "#3e4e2e", rx: 2 },
      { type: "rect", x: 0.62, y: 0.31, w: 0.09, h: 0.09, fill: "#4e5e3e" },
      // Factory chimney (Overpass is an industrial area)
      { type: "rect", x: 0.72, y: 0.44, w: 0.02, h: 0.04, fill: "#a3e635" },
      { type: "text", x: 0.7, y: 0.25, text: "A SITE", size: 6, fill: "#d9f99d", anchor: "middle" },
    ],
    "#a3e635"
  ),
  loc(
    "overpass_b_site",
    "OVERPASS",
    "B Site",
    "easy",
    0.3,
    0.6,
    [
      { type: "rect", x: 0.2, y: 0.52, w: 0.22, h: 0.18, fill: "#2e3e3e", rx: 2 },
      { type: "rect", x: 0.23, y: 0.55, w: 0.1, h: 0.1, fill: "#3e4e4e" },
      { type: "text", x: 0.31, y: 0.5, text: "B SITE", size: 6, fill: "#2dd4bf", anchor: "middle" },
    ],
    "#2dd4bf"
  ),
  loc(
    "overpass_mid",
    "OVERPASS",
    "Mid / Office",
    "medium",
    0.48,
    0.45,
    [
      // Concrete grey (Overpass mid/office)
      { type: "rect", x: 0.39, y: 0.39, w: 0.18, h: 0.14, fill: "#3e3e3e", rx: 1 },
      { type: "rect", x: 0.42, y: 0.42, w: 0.12, h: 0.08, fill: "#4e4e4e" },
      // Window grid (office building)
      { type: "line", x1: 0.42, y1: 0.42, x2: 0.42, y2: 0.5, stroke: "#e879f9", width: 0.003 },
      { type: "line", x1: 0.46, y1: 0.42, x2: 0.46, y2: 0.5, stroke: "#e879f9", width: 0.003 },
      { type: "line", x1: 0.5, y1: 0.42, x2: 0.5, y2: 0.5, stroke: "#e879f9", width: 0.003 },
      { type: "text", x: 0.48, y: 0.36, text: "OFFICE", size: 5, fill: "#f0abfc", anchor: "middle" },
    ],
    "#e879f9"
  ),
];

// ---------- Helpers ----------

export function locationsForMap(map: string): MapLocation[] {
  return LOCATIONS.filter((l) => l.map === map);
}

export function getLocationsByDifficulty(difficulty: Difficulty): MapLocation[] {
  return LOCATIONS.filter((l) => l.difficulty === difficulty);
}

export function pickRoundLocations(
  difficulty: Difficulty,
  count: number,
  usedIds: Set<string>
): MapLocation[] {
  const pool = LOCATIONS.filter(
    (l) => l.difficulty === difficulty && !usedIds.has(l.id)
  );
  // Shuffle and take `count`
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, count);
  // If pool exhausted, fill from any difficulty
  if (picked.length < count) {
    const fallback = LOCATIONS.filter((l) => !usedIds.has(l.id)).sort(
      () => Math.random() - 0.5
    );
    for (const l of fallback) {
      if (picked.length >= count) break;
      if (!picked.some((p) => p.id === l.id)) picked.push(l);
    }
  }
  return picked;
}

// ---------- Mini-map SVG generation ----------
// Renders a stylized top-down minimap for the "Where Exactly?" mode.
// Each map gets a unique layout.

export interface MinimapShape {
  type: "rect" | "circle" | "line" | "path";
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  cx?: number;
  cy?: number;
  r?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  d?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  rx?: number;
  opacity?: number;
}

export const MINIMAP_SHAPES: Record<string, MinimapShape[]> = {
  MIRAGE: [
    // Outer boundary
    { type: "rect", x: 0.05, y: 0.05, w: 0.9, h: 0.9, fill: "#0f0f1a", rx: 4 },
    // A site area (top-right)
    { type: "rect", x: 0.55, y: 0.12, w: 0.38, h: 0.3, fill: "#1a1a2e", rx: 2 },
    // B site area (bottom-left)
    { type: "rect", x: 0.08, y: 0.55, w: 0.35, h: 0.32, fill: "#1a2e1a", rx: 2 },
    // Mid corridor
    { type: "rect", x: 0.35, y: 0.4, w: 0.3, h: 0.2, fill: "#1a1a22", rx: 1 },
    // Connector
    { type: "rect", x: 0.5, y: 0.35, w: 0.15, h: 0.15, fill: "#222233", rx: 1 },
    // Apartments
    { type: "rect", x: 0.08, y: 0.35, w: 0.15, h: 0.18, fill: "#2e1a2e", rx: 1 },
    // CT spawn
    { type: "rect", x: 0.4, y: 0.82, w: 0.25, h: 0.1, fill: "#1a2e3e", rx: 1 },
    // T spawn
    { type: "rect", x: 0.4, y: 0.08, w: 0.25, h: 0.08, fill: "#3e2e1a", rx: 1 },
    // Labels
    { type: "path", d: "M0.55,0.12 L0.93,0.12 L0.93,0.42", fill: "none", stroke: "#a78bfa", strokeWidth: 0.5, opacity: 0.4 },
  ],
  "DUST 2": [
    { type: "rect", x: 0.05, y: 0.05, w: 0.9, h: 0.9, fill: "#1a1508", rx: 4 },
    // A site (top-right)
    { type: "rect", x: 0.6, y: 0.1, w: 0.33, h: 0.25, fill: "#2e2510", rx: 2 },
    // B site (bottom-left)
    { type: "rect", x: 0.07, y: 0.6, w: 0.3, h: 0.3, fill: "#102e18", rx: 2 },
    // Long A (top corridor)
    { type: "rect", x: 0.35, y: 0.08, w: 0.3, h: 0.12, fill: "#2e2518", rx: 1 },
    // Mid
    { type: "rect", x: 0.4, y: 0.4, w: 0.2, h: 0.2, fill: "#252010", rx: 1 },
    // Short (right)
    { type: "rect", x: 0.75, y: 0.4, w: 0.15, h: 0.2, fill: "#2e1810", rx: 1 },
    // CT spawn (bottom)
    { type: "rect", x: 0.35, y: 0.82, w: 0.3, h: 0.1, fill: "#10202e", rx: 1 },
    // T spawn (top)
    { type: "rect", x: 0.35, y: 0.05, w: 0.3, h: 0.06, fill: "#2e2010", rx: 1 },
  ],
  INFERNO: [
    { type: "rect", x: 0.05, y: 0.05, w: 0.9, h: 0.9, fill: "#1a0f0f", rx: 4 },
    // A site (top-right)
    { type: "rect", x: 0.55, y: 0.15, w: 0.35, h: 0.25, fill: "#2e1a1a", rx: 2 },
    // B site (bottom-left)
    { type: "rect", x: 0.1, y: 0.5, w: 0.3, h: 0.3, fill: "#1a2e2e", rx: 2 },
    // Banana (center curve)
    { type: "rect", x: 0.35, y: 0.42, w: 0.3, h: 0.16, fill: "#2e2a1a", rx: 4 },
    // Mid
    { type: "rect", x: 0.3, y: 0.3, w: 0.2, h: 0.12, fill: "#2a2030", rx: 1 },
    // CT spawn
    { type: "rect", x: 0.35, y: 0.82, w: 0.3, h: 0.1, fill: "#1a202e", rx: 1 },
  ],
  NUKE: [
    { type: "rect", x: 0.05, y: 0.05, w: 0.9, h: 0.9, fill: "#0f1520", rx: 4 },
    // A site (top-right)
    { type: "rect", x: 0.55, y: 0.2, w: 0.35, h: 0.25, fill: "#1a2e3e", rx: 2 },
    // B site (bottom-left)
    { type: "rect", x: 0.1, y: 0.5, w: 0.3, h: 0.3, fill: "#2e2a1a", rx: 2 },
    // Roof (top)
    { type: "rect", x: 0.3, y: 0.08, w: 0.4, h: 0.12, fill: "#2a2a3e", rx: 1 },
    // Gate (bottom)
    { type: "rect", x: 0.35, y: 0.75, w: 0.3, h: 0.12, fill: "#2e1a2a", rx: 1 },
    // Mid
    { type: "rect", x: 0.35, y: 0.35, w: 0.3, h: 0.25, fill: "#1a2a3e", rx: 1 },
  ],
  ANCIENT: [
    { type: "rect", x: 0.05, y: 0.05, w: 0.9, h: 0.9, fill: "#152010", rx: 4 },
    // A site (top-right)
    { type: "rect", x: 0.55, y: 0.15, w: 0.35, h: 0.25, fill: "#2e3e1a", rx: 2 },
    // B site (bottom-left)
    { type: "rect", x: 0.1, y: 0.5, w: 0.3, h: 0.3, fill: "#1a2e3e", rx: 2 },
    // Temple / Mid (center)
    { type: "rect", x: 0.35, y: 0.35, w: 0.3, h: 0.25, fill: "#2e2a1a", rx: 1 },
    // CT spawn
    { type: "rect", x: 0.35, y: 0.82, w: 0.3, h: 0.1, fill: "#1a2e1a", rx: 1 },
  ],
  ANUBIS: [
    { type: "rect", x: 0.05, y: 0.05, w: 0.9, h: 0.9, fill: "#1a1020", rx: 4 },
    // A site (top-right)
    { type: "rect", x: 0.55, y: 0.15, w: 0.35, h: 0.25, fill: "#2e1a3e", rx: 2 },
    // B site (bottom-left)
    { type: "rect", x: 0.1, y: 0.5, w: 0.3, h: 0.3, fill: "#1a3e2a", rx: 2 },
    // Pyramid / Mid (center)
    { type: "rect", x: 0.35, y: 0.35, w: 0.3, h: 0.25, fill: "#2e2a1a", rx: 1 },
    // Circle feature
    { type: "circle", cx: 0.5, cy: 0.47, r: 0.06, fill: "#3e3a2a" },
  ],
  VERTIGO: [
    { type: "rect", x: 0.05, y: 0.05, w: 0.9, h: 0.9, fill: "#101828", rx: 4 },
    // A site (top-right)
    { type: "rect", x: 0.55, y: 0.15, w: 0.35, h: 0.25, fill: "#1a1a3e", rx: 2 },
    // B site (bottom-left)
    { type: "rect", x: 0.1, y: 0.5, w: 0.3, h: 0.3, fill: "#1a3e2a", rx: 2 },
    // Cave (bottom-center)
    { type: "circle", cx: 0.5, cy: 0.72, r: 0.1, fill: "#1a2e3e" },
    // Mid
    { type: "rect", x: 0.35, y: 0.35, w: 0.3, h: 0.2, fill: "#2a2a3e", rx: 1 },
  ],
  OVERPASS: [
    { type: "rect", x: 0.05, y: 0.05, w: 0.9, h: 0.9, fill: "#1a1a10", rx: 4 },
    // A site (top-right)
    { type: "rect", x: 0.55, y: 0.15, w: 0.35, h: 0.25, fill: "#2e3e1a", rx: 2 },
    // B site (bottom-left)
    { type: "rect", x: 0.1, y: 0.5, w: 0.3, h: 0.3, fill: "#1a3e3e", rx: 2 },
    // Office / Mid (center)
    { type: "rect", x: 0.35, y: 0.35, w: 0.3, h: 0.25, fill: "#2e1a2e", rx: 1 },
    // CT spawn
    { type: "rect", x: 0.35, y: 0.82, w: 0.3, h: 0.1, fill: "#1a2e1a", rx: 1 },
  ],
};

export function getMinimapShapes(map: string): MinimapShape[] {
  return MINIMAP_SHAPES[map] ?? [];
}
