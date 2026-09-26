"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";

// Универсальная страница подключения: /j/ABCDE
// По коду определяет игру (сетка 9 или викторина) и открывает её.
// Викторина поддерживает параметр join сама (params.join), поэтому
// для неё нужен только редирект на страницу /quiz/j/CODE.
export default function ShortJoinCodePage() {
  const params = useParams<{ join?: string }>();
  const join = (params.join as string | undefined) ?? "";
  const [status, setStatus] = useState<"loading" | "grid" | "quiz" | "notfound">("loading");

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      if (!join) {
        setStatus("notfound");
        return;
      }
      const sb = getSupabaseBrowser();
      if (!sb) {
        setStatus("notfound");
        return;
      }
      try {
        const [gridRes, quizRes] = await Promise.all([
          sb.from("grid_rooms").select("id").eq("code", join).maybeSingle(),
          sb.from("quiz_rooms").select("id").eq("code", join).maybeSingle(),
        ]);
        if (cancelled) return;
        if (gridRes.data) setStatus("grid");
        else if (quizRes.data) setStatus("quiz");
        else setStatus("notfound");
      } catch {
        if (!cancelled) setStatus("notfound");
      }
    }
    void detect();
    return () => { cancelled = true; };
  }, [join]);

  if (status === "grid") {
    return <Redirecting href={`/grid/j/${join}`} label="Открываем сетку 9…" />;
  }
  if (status === "quiz") {
    return <Redirecting href={`/quiz/j/${join}`} label="Открываем викторину…" />;
  }
  if (status === "notfound") {
    return (
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mt-10 rounded-2xl border border-stone-200 bg-white/70 p-6 text-center">
          <div className="text-4xl">🔍</div>
          <h1 className="mt-3 text-xl font-black">Комната не найдена</h1>
          <p className="mt-2 text-sm text-stone-600">
            Проверьте код <b className="font-mono">{join}</b> — возможно, игра
            уже закончилась или ссылка устарела.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a href="/grid/online" className="rounded-xl bg-stone-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-700">
              Сетка 9
            </a>
            <a href="/quiz/online" className="rounded-xl bg-stone-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-700">
              Викторина
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mt-10 flex items-center justify-center gap-3 text-sm text-stone-500">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900" />
        Определяем игру по коду…
      </div>
    </main>
  );
}

function Redirecting({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
  }, [router, href]);
  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mt-10 flex items-center justify-center gap-3 text-sm text-stone-500">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900" />
        {label}
      </div>
    </main>
  );
}
