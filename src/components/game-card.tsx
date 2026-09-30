import Link from "next/link";
import type { GameCard as GameCardType } from "@/lib/games";
import { getTheme } from "@/lib/themes";

const DARK_THEMES = new Set([
  "football-draft",
  "guess-player",
  "career",
  "quiz",
  "cs2-cases",
  "cs2-aim",
  "cs2-higher-lower",
  "akinator",
  "geoguessr",
  "grid-9",
  "flappy-bird",
  "last-shift",
]);

export function GameCard({ game }: { game: GameCardType }) {
  const theme = getTheme(game.theme);
  const dark = DARK_THEMES.has(game.theme);

  const cardStyle = dark
    ? {
        background: "linear-gradient(160deg, rgba(15,15,20,0.95) 0%, rgba(25,25,35,0.95) 100%)",
        borderColor: theme.cardBorder,
        color: theme.text,
      }
    : {
        background: "linear-gradient(160deg, rgba(255,255,255,0.98) 0%, rgba(248,247,244,0.98) 100%)",
        borderColor: theme.cardBorder,
        color: theme.text,
      };

  const footerBg = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";

  const inner = (
    <>
      <div className="p-5">
        <small
          className="text-[11px] font-bold tracking-[0.18em]"
          style={{ color: dark ? theme.headerAccent : theme.primary }}
        >
          {game.tag}
        </small>
        <h2
          className="mt-2 text-2xl font-black"
          style={{ color: dark ? theme.text : theme.text }}
        >
          {game.title}
        </h2>
        <p
          className="mt-2 text-sm leading-relaxed"
          style={{ color: dark ? theme.textMuted : "rgba(28,25,23,0.6)" }}
        >
          {game.desc}
        </p>
      </div>
      <footer
        className="mt-auto flex items-center justify-between px-5 py-4 border-t"
        style={{
          borderColor: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          background: footerBg,
        }}
      >
        <span
          className="text-[11px] font-bold tracking-[0.18em]"
          style={{ color: dark ? theme.textMuted : "rgba(28,25,23,0.4)" }}
        >
          {game.footer}
        </span>
        <span
          className="text-sm font-black transition-transform group-hover:translate-x-1"
          style={{ color: dark ? theme.headerAccent : theme.primary }}
        >
          {game.cta} <i className="not-italic">→</i>
        </span>
      </footer>
    </>
  );

  const cls = `rounded-2xl border overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group`;

  if (game.disabled || !game.href) {
    return <div className={cls} style={cardStyle}>{inner}</div>;
  }

  return (
    <Link href={game.href} className={cls} style={cardStyle}>
      {inner}
    </Link>
  );
}
