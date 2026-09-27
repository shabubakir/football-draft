"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ---------- Конфиг пунктов меню ----------
// Футбольные игры идут первыми (основной контент сайта),
// затем другие мини-игры и рейтинги.
const NAV_ITEMS = [
  { href: "/", label: "ИГРЫ", desc: "Все игры" },
  { href: "/grid/online", label: "СЕТКА 9 ОНЛАЙН", match: "/grid" },
  { href: "/draft", label: "ДРАФТ" },
  { href: "/guess", label: "УГАДАЙ ИГРОКА" },
  { href: "/career", label: "ПУТЬ ФУТБОЛИСТА" },
  { href: "/quiz/online", label: "ВИКТОРИНА" },
  { href: "/cs2", label: "CS2 КЕЙСЫ" },
  { href: "/akinator", label: "AKINATOR" },
  { href: "/geoguessr", label: "GEOGUESSR" },
  { href: "/leaderboard", label: "РЕЙТИНГ" },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const pathname = usePathname() ?? "";

  // Активный раздел по текущему URL
  const isActive = (prefix: string) =>
    prefix === "/" ? pathname === "/" : pathname.startsWith(prefix);

  const linkCls = (active: boolean) =>
    `px-3 py-2 rounded-lg font-semibold transition ${
      active
        ? "text-stone-900 bg-stone-200/60"
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

  return (
    <header className="flex items-center justify-between">
      <Link
        href="/"
        className="text-lg font-black tracking-tight text-stone-900 leading-none"
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
          className="relative"
          onMouseEnter={() => setGamesOpen(true)}
          onMouseLeave={() => setGamesOpen(false)}
        >
          <button
            type="button"
            className={`px-3 py-2 rounded-lg font-semibold transition flex items-center gap-1 ${
              gamesActive
                ? "text-stone-900 bg-stone-200/60"
                : "text-stone-500 hover:text-stone-900 hover:bg-stone-200/40"
            }`}
            aria-expanded={gamesOpen}
            aria-haspopup="menu"
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
              role="menu"
              className="absolute left-0 top-full pt-1 z-50 w-64"
            >
              <div className="rounded-2xl border border-stone-200 bg-white p-2 shadow-lg">
                {gamesItems.map((item) => {
                  const active = (item as { match?: string }).match
                    ? pathname.startsWith((item as { match?: string }).match!)
                    : isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setGamesOpen(false)}
                      className={`block px-4 py-3 rounded-lg transition ${
                        active
                          ? "bg-stone-200/60 font-bold text-stone-900"
                          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ---------- МОБИЛЬНЫЙ БУРГЕР ---------- */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="sm:hidden flex flex-col gap-1 p-2"
        aria-label="Меню"
      >
        <span className="block w-5 h-0.5 bg-stone-900" />
        <span className="block w-5 h-0.5 bg-stone-900" />
        <span className="block w-5 h-0.5 bg-stone-900" />
      </button>

      {open && (
        <div className="sm:hidden absolute left-4 right-4 top-16 z-50 rounded-2xl border border-stone-200 bg-white p-2 shadow-lg max-h-[70vh] overflow-y-auto">
          {NAV_ITEMS.map((item) => {
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
                    ? "bg-stone-200/60 font-bold text-stone-900"
                    : "text-stone-600"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
