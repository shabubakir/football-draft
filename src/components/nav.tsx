"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";
import { getSupabaseBrowser } from "@/lib/auth";
import { levelFromXp } from "@/lib/xp";

// ---------- Конфиг пунктов меню ----------
// Футбольные игры идут первыми (основной контент сайта),
// затем другие мини-игры и рейтинги.
// `match` — префикс пути для подсветки активного пункта.
const NAV_ITEMS = [
  { href: "/", label: "ИГРЫ", desc: "Все игры" },
  { href: "/grid/online", label: "СЕТКА 9 ОНЛАЙН", match: "/grid" },
  { href: "/draft", label: "ДРАФТ", match: "/draft" },
  { href: "/guess", label: "УГАДАЙ ИГРОКА", match: "/guess" },
  { href: "/career", label: "ПУТЬ ФУТБОЛИСТА", match: "/career" },
  { href: "/quiz/online", label: "ВИКТОРИНА", match: "/quiz" },
  // CS2 КЕЙСЫ: без match — активен только на самом /cs2,
  // чтобы /cs2/aim и /cs2/higher-lower подсвечивали только себя.
  { href: "/cs2", label: "CS2 КЕЙСЫ" },
  { href: "/cs2/aim", label: "CS2 AIM", match: "/cs2/aim" },
  { href: "/cs2/higher-lower", label: "CS2 HIGHER/LOWER", match: "/cs2/higher-lower" },
  { href: "/akinator", label: "AKINATOR", match: "/akinator" },
  { href: "/geoguessr", label: "GEOGUESSR", match: "/geoguessr" },
  { href: "/leaderboard", label: "РЕЙТИНГ", match: "/leaderboard" },
] as const;

// ---------- Группы для выпадающего меню «ВСЕ ИГРЫ» ----------
const GAME_GROUPS: { icon: string; title: string; hrefs: string[] }[] = [
  { icon: "⚽", title: "Футбол", hrefs: ["/grid", "/draft", "/guess", "/career", "/quiz"] },
  { icon: "🔫", title: "CS2", hrefs: ["/cs2"] },
  { icon: "🌍", title: "География", hrefs: ["/geoguessr"] },
  { icon: "🎭", title: "Акинатор", hrefs: ["/akinator"] },
];

export function Nav({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const gamesWrapRef = useRef<HTMLDivElement>(null);
  const gamesMenuRef = useRef<HTMLDivElement>(null);

  // Клик вне меню → закрыть
  useEffect(() => {
    if (!gamesOpen) return;
    const handler = (e: MouseEvent) => {
      if (gamesWrapRef.current && !gamesWrapRef.current.contains(e.target as Node)) {
        setGamesOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [gamesOpen]);
  const pathname = usePathname() ?? "";
  const { user, loading, logout } = useAuth();

  // Progress data for authenticated users
  const [totalXp, setTotalXp] = useState(0);
  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => {
    if (!user) return;
    const sb = getSupabaseBrowser();
    if (!sb) return;
    let cancelled = false;

    (async () => {
      const [{ data: xpEvents }, { data: streakRow }] = await Promise.all([
        sb.from("xp_events").select("amount").eq("user_id", user.id),
        sb.from("user_streaks").select("current_streak").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setTotalXp((xpEvents ?? []).reduce((s, e) => s + (e.amount ?? 0), 0));
      setStreakDays(streakRow?.current_streak ?? 0);
    })();

    return () => { cancelled = true; };
  }, [user]);

  // Активный раздел по текущему URL
  const isActive = (prefix: string) =>
    prefix === "/" ? pathname === "/" : pathname.startsWith(prefix);

  const linkCls = (active: boolean) =>
    `px-3 py-2 rounded-lg font-semibold transition ${
      active
        ? dark
          ? "text-white bg-white/10"
          : "text-stone-900 bg-stone-200/60"
        : dark
          ? "text-white/50 hover:text-white hover:bg-white/5"
          : "text-stone-500 hover:text-stone-900 hover:bg-stone-200/40"
    }`;

  // Список "ИГРЫ" (всё, кроме главной и рейтинга) для выпадающего меню
  const gamesItems = NAV_ITEMS.filter(
    (i) => i.href !== "/" && i.href !== "/leaderboard"
  );

  // Активен пункт "ВСЕ ИГРЫ" в дровере, если пользователь на любой из игровых страниц
  const gamesActive = gamesItems.some((i) =>
    (i as { match?: string }).match
      ? pathname.startsWith((i as { match?: string }).match!)
      : isActive(i.href)
  );

  // ---------- User button (desktop) ----------
  const userButton = () => {
    if (loading) return null;

    if (!user) {
      return (
        <Link
          href="/login"
          className="ml-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-500 transition"
        >
          ВОЙТИ
        </Link>
      );
    }

    const level = levelFromXp(totalXp);

    return (
      <div
        className="relative ml-2"
        onMouseEnter={() => setUserMenuOpen(true)}
        onMouseLeave={() => setUserMenuOpen(false)}
      >
        <button
          type="button"
          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition ${dark ? "hover:bg-white/10" : "hover:bg-stone-200/40"}`}
          aria-expanded={userMenuOpen}
          aria-haspopup="menu"
        >
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-black">
            {user.username[0].toUpperCase()}
          </div>
          <div className="text-left leading-tight">
            <span className={`block text-sm font-bold max-w-[90px] truncate ${dark ? "text-white" : "text-stone-900"}`}>
              {user.username}
            </span>
            <span className={`block text-[10px] font-bold ${dark ? "text-white/50" : "text-stone-500"}`}>
              Lvl {level}
              {streakDays > 0 && (
                <span className="text-amber-500"> · 🔥{streakDays}</span>
              )}
            </span>
          </div>
          <svg
            className={`w-3.5 h-3.5 transition-transform ${dark ? "text-white/40" : "text-stone-500"} ${userMenuOpen ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {userMenuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full pt-1 z-50 w-48"
          >
            <div className={`rounded-2xl p-2 shadow-lg ${dark ? "bg-stone-900 border border-white/10" : "border border-stone-200 bg-white"}`}>
              <div className={`px-4 py-2 border-b mb-1 ${dark ? "border-white/10" : "border-stone-100"}`}>
                <div className={`font-bold ${dark ? "text-white" : "text-stone-900"}`}>{user.username}</div>
              </div>
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm transition ${dark ? "text-white/50 hover:bg-white/5 hover:text-white" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"}`}
              >
                📊 Профиль
              </Link>
              <Link
                href="/achievements"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm transition ${dark ? "text-white/50 hover:bg-white/5 hover:text-white" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"}`}
              >
                🏆 Достижения
              </Link>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm transition ${dark ? "text-white/50 hover:bg-white/5 hover:text-white" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"}`}
              >
                ⚙️ Настройки
              </Link>
              <Link
                href="/leaderboard"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm transition ${dark ? "text-white/50 hover:bg-white/5 hover:text-white" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"}`}
              >
                🏆 Лидерборд
              </Link>
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                role="menuitem"
                className="w-full text-left px-4 py-2 rounded-lg text-sm text-rose-500 hover:bg-rose-500/10 transition"
              >
                🚪 Выйти
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <header className={`flex items-center justify-between ${dark ? "text-white" : "text-stone-900"}`}>
      <Link
        href="/"
        className={`text-lg font-black tracking-tight leading-none ${dark ? "text-white" : "text-stone-900"}`}
      >
        FOOTBALL
        <br />
        <b className="font-light italic">DRAFT</b>
      </Link>

      {/* ---------- ДЕСКТОП ---------- */}
      <nav className="hidden sm:flex items-center gap-1 text-sm">
        <Link href="/" className={linkCls(isActive("/"))}>
          ИГРЫ
        </Link>
        <Link href="/leaderboard" className={linkCls(isActive("/leaderboard"))}>
          РЕЙТИНГ
        </Link>

        {/* Выпадающее меню со всеми играми */}
        <div
          ref={gamesWrapRef}
          className="relative"
        >
          <button
            type="button"
            onClick={() => setGamesOpen(true)}
            className={`px-3 py-2 rounded-lg font-semibold transition flex items-center gap-1 ${
              gamesActive
                ? dark ? "text-white bg-white/10" : "text-stone-900 bg-stone-200/60"
                : dark ? "text-white/50 hover:text-white hover:bg-white/5" : "text-stone-500 hover:text-stone-900 hover:bg-stone-200/40"
            }`}
            aria-expanded={gamesOpen}
            aria-haspopup="menu"
            onMouseEnter={() => setGamesOpen(true)}
          >
            ВСЕ ИГРЫ
            <svg
              className={`w-3.5 h-3.5 transition-transform ${gamesOpen ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {gamesOpen && (
            <div
              ref={gamesMenuRef}
              role="menu"
              className="absolute left-0 top-full pt-1 z-50 w-64"
            >
              <div className={`rounded-2xl p-2 shadow-lg ${dark ? "bg-stone-900 border border-white/10" : "border border-stone-200 bg-white"}`}>
                {GAME_GROUPS.map((group) => {
                  const groupItems = gamesItems.filter((i) =>
                    group.hrefs.includes(i.href)
                  );
                  if (groupItems.length === 0) return null;
                  return (
                    <div key={group.title} className="mb-1 last:mb-0">
                      <div
                        className={`px-4 pt-1 pb-0.5 text-[10px] font-black tracking-[0.15em] uppercase ${
                          dark ? "text-white/35" : "text-stone-400"
                        }`}
                      >
                        {group.icon} {group.title}
                      </div>
                      {groupItems.map((item) => {
                        const active = (item as { match?: string }).match
                          ? pathname.startsWith((item as { match?: string }).match!)
                          : isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            onClick={() => setGamesOpen(false)}
                            className={`block px-4 py-2.5 rounded-lg text-sm transition ${
                              active
                                ? dark ? "bg-white/10 font-bold text-white" : "bg-stone-200/60 font-bold text-stone-900"
                                : dark ? "text-white/50 hover:bg-white/5 hover:text-white" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                            }`}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User button */}
        {userButton()}
      </nav>

      {/* ---------- МОБИЛЬНЫЙ БУРГЕР ---------- */}
      <div className="flex items-center gap-2">
        {/* Mobile user button */}
        {loading ? null : !user ? (
          <Link
            href="/login"
            className="sm:hidden px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-black text-xs"
          >
            ВОЙТИ
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="sm:hidden w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-black"
          >
            {user.username[0].toUpperCase()}
          </button>
        )}

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="sm:hidden flex flex-col gap-1 p-2"
          aria-label="Меню"
        >
          <span className={`block w-5 h-0.5 ${dark ? "bg-white" : "bg-stone-900"}`} />
          <span className={`block w-5 h-0.5 ${dark ? "bg-white" : "bg-stone-900"}`} />
          <span className={`block w-5 h-0.5 ${dark ? "bg-white" : "bg-stone-900"}`} />
        </button>
      </div>

      {open && (
        <div className={`sm:hidden absolute left-4 right-4 top-16 z-50 rounded-2xl p-2 shadow-lg max-h-[70vh] overflow-y-auto ${dark ? "bg-stone-900 border border-white/10" : "border border-stone-200 bg-white"}`}>
          {GAME_GROUPS.map((group) => {
            const groupItems = NAV_ITEMS.filter(
              (i) => i.href !== "/" && i.href !== "/leaderboard" && group.hrefs.includes(i.href)
            );
            if (groupItems.length === 0) return null;
            return (
              <div key={group.title}>
                <div className={`px-4 pt-2 pb-0.5 text-[10px] font-black tracking-[0.15em] uppercase ${dark ? "text-white/35" : "text-stone-400"}`}>
                  {group.icon} {group.title}
                </div>
                {groupItems.map((item) => {
                  const active = (item as { match?: string }).match
                    ? pathname.startsWith((item as { match?: string }).match!)
                    : isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`block px-4 py-3 rounded-lg ${
                        active
                          ? dark ? "bg-white/10 font-bold text-white" : "bg-stone-200/60 font-bold text-stone-900"
                          : dark ? "text-white/50" : "text-stone-600"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}

          {/* Mobile user menu */}
          {user && (
            <>
              <div className={`border-t my-1 ${dark ? "border-white/10" : "border-stone-200"}`} />
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className={`block px-4 py-3 rounded-lg ${dark ? "text-white/50" : "text-stone-600"}`}
              >
                📊 Профиль
              </Link>
              <Link
                href="/achievements"
                onClick={() => setOpen(false)}
                className={`block px-4 py-3 rounded-lg ${dark ? "text-white/50" : "text-stone-600"}`}
              >
                🏆 Достижения
              </Link>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className={`block px-4 py-3 rounded-lg ${dark ? "text-white/50" : "text-stone-600"}`}
              >
                ⚙️ Настройки
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="w-full text-left px-4 py-3 rounded-lg text-rose-500"
              >
                🚪 Выйти
              </button>
            </>
          )}
        </div>
      )}

      {/* Mobile user dropdown (when not in burger) */}
      {user && userMenuOpen && !open && (
        <div className={`sm:hidden absolute right-4 top-16 z-50 rounded-2xl p-2 shadow-lg w-48 ${dark ? "bg-stone-900 border border-white/10" : "border border-stone-200 bg-white"}`}>
          <div className={`px-4 py-2 border-b mb-1 ${dark ? "border-white/10" : "border-stone-100"}`}>
            <div className={`font-bold ${dark ? "text-white" : "text-stone-900"}`}>{user.username}</div>
          </div>
          <Link
            href="/profile"
            onClick={() => setUserMenuOpen(false)}
            className={`block px-4 py-2 rounded-lg text-sm ${dark ? "text-white/50 hover:bg-white/5" : "text-stone-600 hover:bg-stone-100"}`}
          >
            📊 Профиль
          </Link>
          <Link
            href="/achievements"
            onClick={() => setUserMenuOpen(false)}
            className={`block px-4 py-2 rounded-lg text-sm ${dark ? "text-white/50 hover:bg-white/5" : "text-stone-600 hover:bg-stone-100"}`}
          >
            🏆 Достижения
          </Link>
          <Link
            href="/settings"
            onClick={() => setUserMenuOpen(false)}
            className={`block px-4 py-2 rounded-lg text-sm ${dark ? "text-white/50 hover:bg-white/5" : "text-stone-600 hover:bg-stone-100"}`}
          >
            ⚙️ Настройки
          </Link>
          <button
            type="button"
            onClick={() => {
              setUserMenuOpen(false);
              logout();
            }}
            className="w-full text-left px-4 py-2 rounded-lg text-sm text-rose-500 hover:bg-rose-500/10"
          >
            🚪 Выйти
          </button>
        </div>
      )}
    </header>
  );
}
