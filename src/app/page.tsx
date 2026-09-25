import Link from "next/link";
import { GAMES } from "@/lib/games";
import { GameCard } from "@/components/game-card";
import { Nav } from "@/components/nav";

export default function Home() {
  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Nav />

      <section className="mt-10 sm:mt-16 grid md:grid-cols-[1.4fr_1fr] gap-6 items-center">
        <div>
          <small className="text-xs tracking-[0.2em] text-stone-500">
            FOOTBALL DRAFT · ИГРОВОЙ ЦЕНТР
          </small>
          <h1 className="mt-3 text-4xl sm:text-5xl font-black leading-tight text-stone-900">
            ВСЕ ФУТБОЛЬНЫЕ
            <br />
            <em className="not-italic font-light italic text-stone-500">
              ИГРЫ В ОДНОМ МЕСТЕ.
            </em>
          </h1>
          <p className="mt-4 max-w-md text-stone-600">
            Играй с друзьями онлайн: угадай футболиста за 10 попыток или
            сразись в «Сетке 9» в реальном времени.
          </p>
        </div>
        <aside className="rounded-2xl border border-stone-200 bg-white/60 backdrop-blur p-5 shadow-sm">
          <small className="text-xs tracking-[0.2em] text-stone-500">
            ИГРАЙ С ДРУЗЬЯМИ
          </small>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">ONLINE</span>
            <span className="text-xs text-stone-500">PvP в реальном времени</span>
          </div>
          <p className="mt-3 text-sm text-stone-600">
            Создай комнату, скинь код другу — и через минуту вы уже на поле.
            Без регистрации, без скачивания.
          </p>
          <Link
            href="/grid/online"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-stone-900 text-white text-sm font-semibold px-4 py-2.5 hover:bg-stone-700 transition"
          >
            СОЗДАТЬ КОМНАТУ →
          </Link>
        </aside>
      </section>

      <div className="mt-14 flex items-baseline justify-between">
        <span className="text-xs tracking-[0.2em] text-stone-500">
          ВЫБЕРИ ИГРУ
        </span>
        <b className="text-sm text-stone-400">{GAMES.length} РЕЖИМА</b>
      </div>

      <section className="mt-4 grid sm:grid-cols-2 gap-4">
        {GAMES.map((g) => (
          <GameCard key={g.title} game={g} />
        ))}
      </section>

      <footer className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400">
        <p>
          Football Draft · сделано для игры с друзьями ·{" "}
          <a href="mailto:you@example.com" className="underline hover:text-stone-600">
            связь
          </a>
        </p>
        <nav className="flex gap-4">
          <a href="/legal" className="hover:text-stone-600">
            Правила
          </a>
        </nav>
      </footer>
    </main>
  );
}
