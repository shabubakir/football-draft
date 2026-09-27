"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";
import { getSupabaseBrowser } from "@/lib/auth";
import { levelFromXp } from "@/lib/xp";

// ---------- Конфиг пунктов меню ----------
// `match` — префикс пути для подсветки активного пункта.
// `icon` — SVG-иконка для мега-меню.
type NavGame = {
  href: string;
  label: string;
  match?: string;
  desc?: string;
  icon: string;
};

const NAV_GAMES: NavGame[] = [
  { href: "/grid/online", label: "СЕТКА 9 ОНЛАЙН", match: "/grid", icon: "grid", desc: "Крестики-нолики с другом" },
  { href: "/draft", label: "ДРАФТ", match: "/draft", icon: "clipboard", desc: "Исторический турнир" },
  { href: "/guess", label: "УГАДАЙ ИГРОКА", match: "/guess", icon: "question", desc: "Ежедневная игра" },
  { href: "/career", label: "ПУТЬ ФУТБОЛИСТА", match: "/career", icon: "route", desc: "Угадай по карьере" },
  // Футбольная викторина: match "/quiz/online" — чтобы /quiz/geo не подсвечивал её
  { href: "/quiz/online", label: "ВИКТОРИНА", match: "/quiz/online", icon: "trophy", desc: "Футбол · до 5 игроков" },
  { href: "/akinator", label: "AKINATOR", match: "/akinator", icon: "ghost", desc: "Akinator · угадай футболиста" },
  // CS2 КЕЙСЫ: без match — активен только на самом /cs2,
  // чтобы /cs2/aim и /cs2/higher-lower подсвечивали только себя.
  { href: "/cs2", label: "CS2 КЕЙСЫ", icon: "grid", desc: "Симулятор кейсов" },
  { href: "/cs2/aim", label: "CS2 AIM", match: "/cs2/aim", icon: "crosshair", desc: "Тренировка реакции" },
  { href: "/cs2/higher-lower", label: "CS2 HIGHER/LOWER", match: "/cs2/higher-lower", icon: "swap", desc: "Угадай, что дороже" },
  { href: "/quiz/geo", label: "ВИКТОРИНА", match: "/quiz/geo", icon: "trophy", desc: "География · до 5 игроков" },
  { href: "/geoguessr", label: "GEOGUESSR", match: "/geoguessr", icon: "pin", desc: "Угадай место на карте" },
];

// ---------- Категории для мега-меню «ВСЕ ИГРЫ» ----------
type NavCategory = {
  title: string;
  icon: string;
  hrefs: string[];
};

const NAV_CATEGORIES: NavCategory[] = [
  {
    title: "ФУТБОЛ",
    icon: "globe",
    hrefs: ["/grid/online", "/draft", "/guess", "/career", "/quiz/online", "/akinator"],
  },
  {
    title: "КИБЕРСПОРТ",
    icon: "gamepad",
    hrefs: ["/cs2", "/cs2/aim", "/cs2/higher-lower"],
  },
  {
    title: "ГЕОГРАФИЯ",
    icon: "pin",
    hrefs: ["/quiz/geo", "/geoguessr"],
  },
];

// ---------- SVG-иконки для мега-меню (Lucide, stroke) ----------
function GameIcon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "globe":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      );
    case "gamepad":
      return (
        <svg {...common}>
          <line x1="6" x2="10" y1="11" y2="11" />
          <line x1="8" x2="8" y1="9" y2="13" />
          <line x1="15" x2="15.01" y1="12" y2="12" />
          <line x1="18" x2="18.01" y1="10" y2="10" />
          <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M3 9h18" />
          <path d="M3 15h18" />
          <path d="M9 3v18" />
          <path d="M15 3v18" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...common}>
          <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="M9 12h6" />
          <path d="M9 16h6" />
        </svg>
      );
    case "question":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "route":
      return (
        <svg {...common}>
          <circle cx="6" cy="19" r="3" />
          <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
          <circle cx="18" cy="5" r="3" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...common}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      );
    case "crosshair":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <line x1="22" x2="18" y1="12" y2="12" />
          <line x1="6" x2="2" y1="12" y2="12" />
          <line x1="12" x2="12" y1="6" y2="2" />
          <line x1="12" x2="12" y1="22" y2="18" />
        </svg>
      );
    case "swap":
      return (
        <svg {...common}>
          <path d="m3 16 4 4 4-4" />
          <path d="M7 20V4" />
          <path d="m21 8-4-4-4 4" />
          <path d="M17 4v16" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case "ghost":
      return (
        <svg {...common}>
          <path d="M9 10h.01" />
          <path d="M15 10h.01" />
          <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

export function Nav({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const gamesWrapRef = useRef<HTMLDivElement>(null);

  // Клик вне меню → закрыть
  useEffect(() => {
    if (!gamesOpen) return;
    const handler = (e: MouseEvent) => {
      if (gamesWrapRef.current && !gamesWrapRef.current.contains(e.target as Node)) {
        setGamesOpen(false);
        setActiveCategory(null);
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

  // Активен пункт "ВСЕ ИГРЫ" в дровере, если пользователь на любой из игровых страниц
  const gamesActive = NAV_GAMES.some((i) =>
    i.match ? pathname.startsWith(i.match) : isActive(i.href)
  );

  // Категория, содержащая текущую страницу (для подсветки + авто-открытия панели)
  const activeCategoryOf = (cat: NavCategory) =>
    NAV_GAMES.find(
      (g) =>
        cat.hrefs.includes(g.href) &&
        (g.match ? pathname.startsWith(g.match) : isActive(g.href))
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
            onClick={() => {
              if (gamesOpen) {
                setGamesOpen(false);
                setActiveCategory(null);
              } else {
                setGamesOpen(true);
                setActiveCategory(
                  NAV_CATEGORIES.find((c) => activeCategoryOf(c))?.title ?? null
                );
              }
            }}
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

          {/* ---------- МЕГА-МЕНЮ ---------- */}
          {gamesOpen && (
            <div
              role="menu"
              className="absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50 flex items-start"
            >
              {/* Левая панель: категории */}
              <div
                className={`w-44 rounded-2xl p-2 shadow-xl self-start ${
                  dark ? "bg-stone-900 border border-white/10" : "bg-white border border-stone-200"
                }`}
              >
                {NAV_CATEGORIES.map((cat) => {
                  const isActiveCat = activeCategory === cat.title;
                  const hasCurrent = !!activeCategoryOf(cat);
                  return (
                    <button
                      key={cat.title}
                      type="button"
                      role="menuitem"
                      onClick={() => setActiveCategory(cat.title)}
                      onMouseEnter={() => setActiveCategory(cat.title)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl mb-1 text-left transition ${
                        isActiveCat
                          ? dark
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-emerald-50 text-emerald-700"
                          : dark
                            ? "text-white/60 hover:bg-white/5 hover:text-white"
                            : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <GameIcon name={cat.icon} className="w-5 h-5" />
                        <span className="text-sm font-bold">{cat.title}</span>
                      </span>
                      <svg
                        className={`w-4 h-4 ${isActiveCat ? "" : dark ? "text-white/30" : "text-stone-300"}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.21 14.77a.75.75 0 01.02-1.06L11.17 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {hasCurrent && !isActiveCat && (
                        <span className={`w-1.5 h-1.5 rounded-full ${dark ? "bg-emerald-400" : "bg-emerald-500"}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Правая панель: игры активной категории */}
              {(() => {
                const cat = NAV_CATEGORIES.find((c) => c.title === activeCategory);
                if (!cat) return null;
                const catGames = NAV_GAMES.filter((g) => cat.hrefs.includes(g.href));
                return (
                  <div
                    className={`w-80 rounded-2xl p-3 shadow-xl ${
                      dark ? "bg-stone-900 border border-white/10" : "bg-white border border-stone-200"
                    }`}
                  >
                    <div className="grid gap-1">
                      {catGames.map((g) => {
                        const active = g.match
                          ? pathname.startsWith(g.match)
                          : isActive(g.href);
                        return (
                          <Link
                            key={g.href}
                            href={g.href}
                            role="menuitem"
                            onClick={() => {
                              setGamesOpen(false);
                              setActiveCategory(null);
                            }}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                              active
                                ? dark
                                  ? "bg-white/10 text-white font-bold"
                                  : "bg-stone-100 text-stone-900 font-bold"
                                : dark
                                  ? "text-white/60 hover:bg-white/5 hover:text-white"
                                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                            }`}
                          >
                            <span
                              className={`shrink-0 ${
                                active
                                  ? dark ? "text-emerald-300" : "text-emerald-600"
                                  : dark ? "text-white/40" : "text-stone-400"
                              }`}
                            >
                              <GameIcon name={g.icon} />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold truncate">{g.label}</span>
                              {g.desc && (
                                <span
                                  className={`block text-[11px] truncate ${
                                    dark ? "text-white/40" : "text-stone-500"
                                  }`}
                                >
                                  {g.desc}
                                </span>
                              )}
                            </span>
                          </Link>
                        );
                      })}
                    </div>

                  </div>
                );
              })()}
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
          {NAV_CATEGORIES.map((cat) => {
            const catGames = NAV_GAMES.filter((g) => cat.hrefs.includes(g.href));
            if (catGames.length === 0) return null;
            return (
              <div key={cat.title}>
                <div className={`flex items-center gap-2 px-4 pt-2 pb-0.5 text-[10px] font-black tracking-[0.15em] uppercase ${dark ? "text-white/35" : "text-stone-400"}`}>
                  <GameIcon name={cat.icon} className="w-3.5 h-3.5" />
                  {cat.title}
                </div>
                {catGames.map((item) => {
                  const active = item.match
                    ? pathname.startsWith(item.match)
                    : isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg ${
                        active
                          ? dark ? "bg-white/10 font-bold text-white" : "bg-stone-200/60 font-bold text-stone-900"
                          : dark ? "text-white/50" : "text-stone-600"
                      }`}
                    >
                      <GameIcon
                        name={item.icon}
                        className={`w-4 h-4 shrink-0 ${active ? "" : dark ? "text-white/30" : "text-stone-400"}`}
                      />
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
