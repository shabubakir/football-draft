// ============================================================
// GAME THEMES — type definitions
// ============================================================

export type GameThemeId =
  | "football-draft"
  | "grid-9"
  | "guess-player"
  | "career"
  | "quiz"
  | "cs2-cases"
  | "cs2-aim"
  | "cs2-higher-lower"
  | "akinator"
  | "geoguessr"
  | "cs2-map-guess"
  | "reaction-test"
  | "flappy-bird"
  | "last-shift"
  | "backrooms"
  | "neutral";

export interface GameTheme {
  id: GameThemeId;
  /** Background gradient or color */
  background: string;
  /** Subtle background pattern (CSS) */
  backgroundPattern?: string;
  /** Primary action color */
  primary: string;
  /** Secondary / accent */
  accent: string;
  /** Card background */
  card: string;
  /** Card border */
  cardBorder: string;
  /** Text primary */
  text: string;
  /** Text secondary */
  textMuted: string;
  /** Button primary bg */
  buttonBg: string;
  /** Button primary text */
  buttonText: string;
  /** Button hover */
  buttonHover: string;
  /** Header accent */
  headerAccent: string;
  /** Special effects (glow, particles, etc.) */
  effect?: string;
  /** Font weight style hint */
  fontStyle?: "bold" | "medium" | "light";
}
