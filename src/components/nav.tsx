"use client";

import { useState } from "react";
import Link from "next/link";

export function Nav() {
  const [open, setOpen] = useState(false);
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
        <Link href="/" className="px-3 py-2 rounded-lg font-semibold text-stone-900 bg-stone-200/60">
          ИГРЫ
        </Link>
        <Link href="/grid/online" className="px-3 py-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/40 transition">
          ОНЛАЙН
        </Link>
        <Link href="/guess" className="px-3 py-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/40 transition">
          УГАДАЙ ИГРОКА
        </Link>
        <Link href="/quiz/online" className="px-3 py-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/40 transition">
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
          <Link href="/" onClick={() => setOpen(false)} className="block px-4 py-3 rounded-lg font-semibold text-stone-900">
            ИГРЫ
          </Link>
          <Link href="/grid/online" onClick={() => setOpen(false)} className="block px-4 py-3 rounded-lg text-stone-600">
            СЕТКА 9 ОНЛАЙН
          </Link>
          <Link href="/guess" onClick={() => setOpen(false)} className="block px-4 py-3 rounded-lg text-stone-600">
            УГАДАЙ ИГРОКА
          </Link>
          <Link href="/quiz/online" onClick={() => setOpen(false)} className="block px-4 py-3 rounded-lg text-stone-600">
            ВИКТОРИНА (5 игроков)
          </Link>
        </div>
      )}
    </header>
  );
}
