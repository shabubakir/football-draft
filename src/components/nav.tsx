"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const [open, setOpen] = useState(false);
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
      <nav className="hidden sm:flex items-center gap-1 text-sm">
        <Link href="/" className={linkCls(isActive("/"))}>
          ИГРЫ
        </Link>
        <Link href="/grid/online" className={linkCls(isActive("/grid"))}>
          ОНЛАЙН
        </Link>
        <Link href="/guess" className={linkCls(isActive("/guess"))}>
          УГАДАЙ ИГРОКА
        </Link>
        <Link href="/quiz/online" className={linkCls(isActive("/quiz"))}>
          ВИКТОРИНА
        </Link>
      </nav>
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
        <div className="sm:hidden absolute left-4 right-4 top-16 z-50 rounded-2xl border border-stone-200 bg-white p-2 shadow-lg">
          <Link href="/" onClick={() => setOpen(false)} className={`block px-4 py-3 rounded-lg ${isActive("/") ? "bg-stone-200/60 font-bold text-stone-900" : "text-stone-600"}`}>
            ИГРЫ
          </Link>
          <Link href="/grid/online" onClick={() => setOpen(false)} className={`block px-4 py-3 rounded-lg ${isActive("/grid") ? "bg-stone-200/60 font-bold text-stone-900" : "text-stone-600"}`}>
            СЕТКА 9 ОНЛАЙН
          </Link>
          <Link href="/guess" onClick={() => setOpen(false)} className={`block px-4 py-3 rounded-lg ${isActive("/guess") ? "bg-stone-200/60 font-bold text-stone-900" : "text-stone-600"}`}>
            УГАДАЙ ИГРОКА
          </Link>
          <Link href="/quiz/online" onClick={() => setOpen(false)} className={`block px-4 py-3 rounded-lg ${isActive("/quiz") ? "bg-stone-200/60 font-bold text-stone-900" : "text-stone-600"}`}>
            ВИКТОРИНА (5 игроков)
          </Link>
        </div>
      )}
    </header>
  );
}
