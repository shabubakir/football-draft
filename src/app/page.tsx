import Link from "next/link";
import { GAMES } from "@/lib/games";
import { GameCard } from "@/components/game-card";
import { Nav } from "@/components/nav";
import { ReportBugButton } from "@/components/report-bug";
import { ProfileBadge } from "@/components/profile-badge";
import { ProgressCard } from "@/components/progress-card";

export default function Home() {
  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Nav dark />

      <section className="mt-10 sm:mt-16 grid md:grid-cols-[1.4fr_1fr] gap-6 items-center">
        <div>
          <small className="text-xs tracking-[0.2em] text-stone-400">
            FOOTBALL DRAFT · ИГРОВОЙ ЦЕНТР
          </small>
          <h1 className="mt-3 text-4xl sm:text-5xl font-black leading-tight text-white">
            ВСЕ ФУТБОЛЬНЫЕ
            <br />
            <em className="not-italic font-light italic text-emerald-400">
              ИГРЫ В ОДНОМ МЕСТЕ.
            </em>
          </h1>
          <p className="mt-4 max-w-md text-stone-400">
            Играй с друзьями онлайн: угадай футболиста за 10 попыток или
            сразись в «Сетке 9» в реальном времени.
          </p>
        </div>
        <aside className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
          <small className="text-xs tracking-[0.2em] text-stone-400">
            ИГРАЙ С ДРУЗЬЯМИ
          </small>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400">ONLINE</span>
            <span className="text-xs text-stone-500">PvP в реальном времени</span>
          </div>
          <p className="mt-3 text-sm text-stone-400">
            Создай комнату, скинь код другу — и через минуту вы уже на поле.
            Без регистрации, без скачивания.
          </p>
          <Link
            href="/grid/online"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-500 text-stone-950 text-sm font-bold px-4 py-2.5 hover:bg-emerald-400 transition"
          >
            СОЗДАТЬ КОМНАТУ →
          </Link>
        </aside>
      </section>

      <div className="mt-14 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs tracking-[0.2em] text-stone-500">
          ВЫБЕРИ ИГРУ
        </span>
        <div className="flex items-center gap-4">
          <ProfileBadge />
          <Link
            href="/leaderboard"
            className="text-sm font-semibold text-stone-300 hover:text-white"
          >
            РЕЙТИНГ →
          </Link>
        </div>
      </div>

      {/* Compact progress card for authed users */}
      <div className="mt-6 max-w-md">
        <ProgressCard />
      </div>

      <section className="mt-4 grid sm:grid-cols-2 gap-4">
        {GAMES.map((g) => (
          <GameCard key={g.title} game={g} />
        ))}
      </section>

      <footer className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
        <p>
          Football Draft · сделано для игры с друзьями ·{" "}
          <ReportBugButton />
        </p>
        <nav className="flex gap-4">
          <a href="/legal" className="hover:text-stone-300">
            Правила
          </a>
        </nav>
      </footer>
    </main>
  );
}
