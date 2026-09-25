import Link from "next/link";
import type { GameCard as GameCardType } from "@/lib/games";

export function GameCard({ game }: { game: GameCardType }) {
  const inner = (
    <>
      <div className="p-5">
        <small className="text-[11px] tracking-[0.18em] text-stone-500">
          {game.tag}
        </small>
        <h2 className="mt-2 text-2xl font-black text-stone-900">{game.title}</h2>
        <p className="mt-2 text-sm text-stone-600 leading-relaxed">{game.desc}</p>
      </div>
      <footer className="mt-auto flex items-center justify-between px-5 py-4 border-t border-stone-200/70 bg-white/40">
        <span className="text-[11px] tracking-[0.18em] text-stone-500">
          {game.footer}
        </span>
        <span className="text-sm font-semibold text-stone-900">
          {game.cta} <i className="not-italic">→</i>
        </span>
      </footer>
    </>
  );

  if (game.disabled || !game.href) {
    return (
      <div
        className={`rounded-2xl border border-stone-200 bg-gradient-to-br ${game.accent} overflow-hidden flex flex-col opacity-90`}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={game.href}
      className={`rounded-2xl border border-stone-200 bg-gradient-to-br ${game.accent} overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition group`}
    >
      {inner}
    </Link>
  );
}
