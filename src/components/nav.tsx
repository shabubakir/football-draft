"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";

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
  { href: "/cs2", label: "CS2 КЕЙСЫ", match: "/cs2" },
  { href: "/cs2/aim", label: "CS2 AIM" },
  { href: "/cs2/higher-lower", label: "CS2 HIGHER/LOWER" },
  { href: "/akinator", label: "AKINATOR" },
  { href: "/geoguessr", label: "GEOGUESSR" },
  { href: "/leaderboard", label: "РЕЙТИНГ" },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const { user, loading, logout } = useAuth();

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

    return (
      <div
        className="relative ml-2"
        onMouseEnter={() => setUserMenuOpen(true)}
        onMouseLeave={() => setUserMenuOpen(false)}
      >
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-stone-200/40 transition"
          aria-expanded={userMenuOpen}
          aria-haspopup="menu"
        >
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-black">
            {user.username[0].toUpperCase()}
          </div>
          <span className="text-sm font-bold text-stone-900 max-w-[100px] truncate">
            {user.username}
          </span>
          <svg
            className={`w-3.5 h-3.5 text-stone-500 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
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
            <div className="rounded-2xl border border-stone-200 bg-white p-2 shadow-lg">
              <div className="px-4 py-2 border-b border-stone-100 mb-1">
                <div className="font-bold text-stone-900">{user.username}</div>
              </div>
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                className="block px-4 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition"
              >
                📊 Профиль
              </Link>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                className="block px-4 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition"
              >
                ⚙️ Настройки
              </Link>
              <Link
                href="/leaderboard"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                className="block px-4 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition"
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
                className="w-full text-left px-4 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50 transition"
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
          <span className="block w-5 h-0.5 bg-stone-900" />
          <span className="block w-5 h-0.5 bg-stone-900" />
          <span className="block w-5 h-0.5 bg-stone-900" />
        </button>
      </div>

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

          {/* Mobile user menu */}
          {user && (
            <>
              <div className="border-t border-stone-200 my-1" />
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="block px-4 py-3 rounded-lg text-stone-600"
              >
                📊 Профиль
              </Link>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="block px-4 py-3 rounded-lg text-stone-600"
              >
                ⚙️ Настройки
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="w-full text-left px-4 py-3 rounded-lg text-rose-600"
              >
                🚪 Выйти
              </button>
            </>
          )}
        </div>
      )}

      {/* Mobile user dropdown (when not in burger) */}
      {user && userMenuOpen && !open && (
        <div className="sm:hidden absolute right-4 top-16 z-50 rounded-2xl border border-stone-200 bg-white p-2 shadow-lg w-48">
          <div className="px-4 py-2 border-b border-stone-100 mb-1">
            <div className="font-bold text-stone-900">{user.username}</div>
          </div>
          <Link
            href="/profile"
            onClick={() => setUserMenuOpen(false)}
            className="block px-4 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100"
          >
            📊 Профиль
          </Link>
          <Link
            href="/settings"
            onClick={() => setUserMenuOpen(false)}
            className="block px-4 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100"
          >
            ⚙️ Настройки
          </Link>
          <button
            type="button"
            onClick={() => {
              setUserMenuOpen(false);
              logout();
            }}
            className="w-full text-left px-4 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50"
          >
            🚪 Выйти
          </button>
        </div>
      )}
    </header>
  );
}
