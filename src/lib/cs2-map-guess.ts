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
  | { type: "circle"; cx: number; cy: number; r: number; fill: string }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; width: number }
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
  // ===== MIRAGE =====
  loc(
    "mirage_a_site",
    "MIRAGE",
    "A Site",
    "easy",
    0.72,
    0.35,
    [
      { type: "rect", x: 0.6, y: 0.25, w: 0.3, h: 0.22, fill: "#2d1b4e", rx: 2 },
      { type: "rect", x: 0.65, y: 0.28, w: 0.12, h: 0.12, fill: "#3d2b5e" },
      { type: "rect", x: 0.8, y: 0.28, w: 0.08, h: 0.1, fill: "#4a3572" },
      { type: "text", x: 0.75, y: 0.2, text: "A SITE", size: 6, fill: "#a78bfa", anchor: "middle" },
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
      { type: "rect", x: 0.15, y: 0.52, w: 0.28, h: 0.24, fill: "#1b3a4e", rx: 2 },
      { type: "rect", x: 0.18, y: 0.55, w: 0.1, h: 0.1, fill: "#2b4a5e" },
      { type: "rect", x: 0.3, y: 0.58, w: 0.1, h: 0.12, fill: "#2b4a5e" },
      { type: "text", x: 0.29, y: 0.5, text: "B SITE", size: 6, fill: "#60a5fa", anchor: "middle" },
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
      { type: "rect", x: 0.35, y: 0.4, w: 0.3, h: 0.18, fill: "#2d3b4e", rx: 2 },
      { type: "rect", x: 0.38, y: 0.43, w: 0.24, h: 0.12, fill: "#3d4b5e" },
      { type: "line", x1: 0.35, y1: 0.49, x2: 0.65, y2: 0.49, stroke: "#4a5a6a", width: 1 },
      { type: "text", x: 0.5, y: 0.38, text: "MID", size: 6, fill: "#94a3b8", anchor: "middle" },
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

  // ===== DUST 2 =====
  loc(
    "dust2_a_site",
    "DUST 2",
    "A Site",
    "easy",
    0.75,
    0.3,
    [
      { type: "rect", x: 0.65, y: 0.22, w: 0.28, h: 0.18, fill: "#4e3b2b", rx: 2 },
      { type: "rect", x: 0.68, y: 0.25, w: 0.1, h: 0.1, fill: "#5e4b3b" },
      { type: "rect", x: 0.8, y: 0.26, w: 0.08, h: 0.08, fill: "#6e5b4b" },
      { type: "text", x: 0.79, y: 0.2, text: "A SITE", size: 6, fill: "#fbbf24", anchor: "middle" },
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
      { type: "rect", x: 0.15, y: 0.56, w: 0.26, h: 0.22, fill: "#3b4e2b", rx: 2 },
      { type: "rect", x: 0.18, y: 0.6, w: 0.1, h: 0.1, fill: "#4b5e3b" },
      { type: "text", x: 0.28, y: 0.54, text: "B SITE", size: 6, fill: "#4ade80", anchor: "middle" },
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
      { type: "rect", x: 0.4, y: 0.42, w: 0.2, h: 0.16, fill: "#4e4a3b", rx: 1 },
      { type: "rect", x: 0.43, y: 0.45, w: 0.14, h: 0.1, fill: "#5e5a4b" },
      { type: "text", x: 0.5, y: 0.4, text: "MID DOORS", size: 5, fill: "#eab308", anchor: "middle" },
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

  // ===== INFERNO =====
  loc(
    "inferno_a_site",
    "INFERNO",
    "A Site",
    "easy",
    0.7,
    0.35,
    [
      { type: "rect", x: 0.6, y: 0.27, w: 0.26, h: 0.18, fill: "#4e2b2b", rx: 2 },
      { type: "rect", x: 0.63, y: 0.3, w: 0.1, h: 0.1, fill: "#5e3b3b" },
      { type: "text", x: 0.73, y: 0.25, text: "A SITE", size: 6, fill: "#f87171", anchor: "middle" },
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
      { type: "rect", x: 0.2, y: 0.52, w: 0.24, h: 0.2, fill: "#2b3e4e", rx: 2 },
      { type: "rect", x: 0.23, y: 0.55, w: 0.1, h: 0.1, fill: "#3b4e5e" },
      { type: "text", x: 0.32, y: 0.5, text: "B SITE", size: 6, fill: "#38bdf8", anchor: "middle" },
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
      { type: "rect", x: 0.4, y: 0.48, w: 0.2, h: 0.14, fill: "#4e4b2b", rx: 3 },
      { type: "rect", x: 0.43, y: 0.5, w: 0.14, h: 0.08, fill: "#5e5b3b" },
      { type: "text", x: 0.5, y: 0.46, text: "BANANA", size: 5, fill: "#facc15", anchor: "middle" },
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

  // ===== NUKE =====
  loc(
    "nuke_a_site",
    "NUKE",
    "A Site",
    "easy",
    0.7,
    0.4,
    [
      { type: "rect", x: 0.6, y: 0.32, w: 0.24, h: 0.18, fill: "#1a3a4e", rx: 2 },
      { type: "rect", x: 0.63, y: 0.35, w: 0.1, h: 0.1, fill: "#2a4a5e" },
      { type: "text", x: 0.72, y: 0.3, text: "A SITE", size: 6, fill: "#22d3ee", anchor: "middle" },
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
      { type: "rect", x: 0.2, y: 0.48, w: 0.22, h: 0.18, fill: "#3e2a1a", rx: 2 },
      { type: "rect", x: 0.23, y: 0.51, w: 0.08, h: 0.1, fill: "#4e3a2a" },
      { type: "text", x: 0.31, y: 0.46, text: "B SITE", size: 6, fill: "#fb923c", anchor: "middle" },
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
      { type: "rect", x: 0.35, y: 0.08, w: 0.3, h: 0.12, fill: "#2a2a3e", rx: 1 },
      { type: "rect", x: 0.38, y: 0.1, w: 0.24, h: 0.08, fill: "#3a3a4e" },
      { type: "text", x: 0.5, y: 0.06, text: "ROOF", size: 5, fill: "#60a5fa", anchor: "middle" },
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

  // ===== ANCIENT =====
  loc(
    "ancient_a_site",
    "ANCIENT",
    "A Site",
    "easy",
    0.68,
    0.38,
    [
      { type: "rect", x: 0.58, y: 0.3, w: 0.24, h: 0.18, fill: "#3e4e2a", rx: 2 },
      { type: "rect", x: 0.61, y: 0.33, w: 0.1, h: 0.1, fill: "#4e5e3a" },
      { type: "text", x: 0.7, y: 0.28, text: "A SITE", size: 6, fill: "#84cc16", anchor: "middle" },
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
      { type: "rect", x: 0.22, y: 0.5, w: 0.22, h: 0.18, fill: "#2a3e4e", rx: 2 },
      { type: "rect", x: 0.25, y: 0.53, w: 0.1, h: 0.1, fill: "#3a4e5e" },
      { type: "text", x: 0.33, y: 0.48, text: "B SITE", size: 6, fill: "#38bdf8", anchor: "middle" },
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

  // ===== ANUBIS =====
  loc(
    "anubis_a_site",
    "ANUBIS",
    "A Site",
    "easy",
    0.72,
    0.32,
    [
      { type: "rect", x: 0.62, y: 0.24, w: 0.26, h: 0.18, fill: "#3e2e4e", rx: 2 },
      { type: "rect", x: 0.65, y: 0.27, w: 0.1, h: 0.1, fill: "#4e3e5e" },
      { type: "text", x: 0.75, y: 0.22, text: "A SITE", size: 6, fill: "#c084fc", anchor: "middle" },
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
      { type: "rect", x: 0.18, y: 0.52, w: 0.22, h: 0.18, fill: "#2e3e2e", rx: 2 },
      { type: "rect", x: 0.21, y: 0.55, w: 0.1, h: 0.1, fill: "#3e4e3e" },
      { type: "text", x: 0.29, y: 0.5, text: "B SITE", size: 6, fill: "#4ade80", anchor: "middle" },
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

  // ===== VERTIGO =====
  loc(
    "vertigo_a_site",
    "VERTIGO",
    "A Site",
    "easy",
    0.65,
    0.4,
    [
      { type: "rect", x: 0.55, y: 0.32, w: 0.22, h: 0.18, fill: "#2e2e4e", rx: 2 },
      { type: "rect", x: 0.58, y: 0.35, w: 0.1, h: 0.1, fill: "#3e3e5e" },
      { type: "text", x: 0.66, y: 0.3, text: "A SITE", size: 6, fill: "#818cf8", anchor: "middle" },
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
      { type: "circle", cx: 0.5, cy: 0.7, r: 0.08, fill: "#1a2e3e" },
      { type: "circle", cx: 0.5, cy: 0.7, r: 0.05, fill: "#2a3e4e" },
      { type: "text", x: 0.5, y: 0.6, text: "CAVE", size: 5, fill: "#22d3ee", anchor: "middle" },
    ],
    "#22d3ee"
  ),

  // ===== OVERPASS =====
  loc(
    "overpass_a_site",
    "OVERPASS",
    "A Site",
    "easy",
    0.68,
    0.35,
    [
      { type: "rect", x: 0.58, y: 0.27, w: 0.24, h: 0.18, fill: "#3e3e2e", rx: 2 },
      { type: "rect", x: 0.61, y: 0.3, w: 0.1, h: 0.1, fill: "#4e4e3e" },
      { type: "text", x: 0.7, y: 0.25, text: "A SITE", size: 6, fill: "#a3e635", anchor: "middle" },
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
      { type: "rect", x: 0.38, y: 0.38, w: 0.2, h: 0.16, fill: "#3e2e3e", rx: 1 },
      { type: "rect", x: 0.41, y: 0.41, w: 0.14, h: 0.1, fill: "#4e3e4e" },
      { type: "text", x: 0.48, y: 0.36, text: "OFFICE", size: 5, fill: "#e879f9", anchor: "middle" },
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
