import { Nav } from "@/components/nav";

export const metadata = {
  title: "Правила — Football Draft",
};

export default function LegalPage() {
  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Nav />
      <div className="mt-10 space-y-6">
        <h1 className="text-3xl font-black">
          ПРАВИЛА <em className="font-light italic text-stone-500">БЕЗ МЕЛКОГО ШРИФТА</em>
        </h1>
        <section className="rounded-2xl border border-stone-200 bg-white/70 p-5">
          <h2 className="font-bold text-lg">Угадай игрока</h2>
          <ul className="mt-3 space-y-2 text-sm text-stone-600 list-disc pl-5">
            <li>Каждый день — новый футболист.</li>
            <li>10 попыток. Зелёный — угадал, жёлтый — близкий (страна, позиция, возраст, клуб), серый — мимо.</li>
            <li>Ответ фиксируется по дате.</li>
          </ul>
        </section>
        <section className="rounded-2xl border border-stone-200 bg-white/70 p-5">
          <h2 className="font-bold text-lg">Сетка 9 онлайн</h2>
          <ul className="mt-3 space-y-2 text-sm text-stone-600 list-disc pl-5">
            <li>Хост создаёт комнату, гость подключается по коду.</li>
            <li>Каждый игрок заполняет 9 клеток так, чтобы все футболисты пересекались по строкам и колонкам.</li>
            <li>Счёт: кто заполнил больше линий первым — тот победил. Если оба по 3 — ничья.</li>
            <li>Игра идёт в реальном времени (Supabase Realtime).</li>
          </ul>
        </section>
        <p className="text-xs text-stone-400">
          Football Draft · сделано для игры с друзьями · {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}
