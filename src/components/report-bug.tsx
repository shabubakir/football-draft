"use client";

import { useState } from "react";

// Кнопка обратной связи по игровым данным (клубы, годы, позиции).
// Открывает письмо — самый простой канал без backend-формы.
export function ReportBugButton() {
  const [open, setOpen] = useState(false);

  const mailHref = (subject: string, body: string) =>
    "mailto:you@example.com?subject=" +
    encodeURIComponent(subject) +
    "&body=" +
    encodeURIComponent(body);

  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="underline hover:text-stone-600"
      >
        Сообщить об ошибке в базе
      </button>
      {open && (
        <span
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-xl border border-stone-200 bg-white p-3 shadow-lg text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <small className="block text-[11px] text-stone-500">
            Нашли неверный клуб, год или позицию? Напишите — исправим.
          </small>
          <a
            href={mailHref(
              "Ошибка в базе Football Draft",
              "Игра: \nИгрок: \nЧто неверно: \nКак должно быть:"
            )}
            onClick={() => setOpen(false)}
            className="mt-2 inline-block rounded-lg bg-stone-900 text-white text-xs font-semibold px-3 py-2 hover:bg-stone-700"
          >
            НАПИСАТЬ ПИСЬМО →
          </a>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-1 block w-full text-center text-[11px] text-stone-400 hover:text-stone-600"
          >
            закрыть
          </button>
        </span>
      )}
    </span>
  );
}
