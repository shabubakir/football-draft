import Link from "next/link";
import type { GameCard as GameCardType } from "@/lib/games";
import { getTheme } from "@/lib/themes";

export function GameCard({ game }: { game: GameCardType }) {
  const theme = getTheme(game.theme);

  // Единый тёмный стиль для всех карточек на главной:
  // общий фон, одинаковые границы, один акцент (emerald).
  // Фирменный цвет игры показываем только тонким штрихом слева.
  const cls = `relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.03] flex flex-col hover:shadow-xl hover:-translate-y-1 hover:border-white/20 transition-all duration-300 group`;

  const inner = (
    <>
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: theme.primary }}
        aria-hidden
      />
      <div className="p-5 pl-6">
        <small className="text-[11px] font-bold tracking-[0.18em] text-stone-400">
          {game.tag}
        </small>
        <h2 className="mt-2 text-2xl font-black text-white">{game.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-400">{game.desc}</p>
      </div>
      <footer className="mt-auto flex items-center justify-between px-5 pl-6 py-4 border-t border-white/10 bg-white/[0.02]">
        <span className="text-[11px] font-bold tracking-[0.18em] text-stone-500">
          {game.footer}
        </span>
        <span className="text-sm font-black text-emerald-400 transition-transform group-hover:translate-x-1">
          {game.cta} <i className="not-italic">→</i>
        </span>
      </footer>
    </>
  );

  if (game.disabled || !game.href) {
    return <div className={cls}>{inner}</div>;
  }

  return (
    <Link href={game.href} className={cls}>
      {inner}
    </Link>
  );
}
