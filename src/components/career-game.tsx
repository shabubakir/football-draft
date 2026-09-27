"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PLAYERS, type Player } from "@/lib/players";
import { getSupabaseBrowser } from "@/lib/supabase";
import {
  addXp,
  ensureProfile,
  getDeviceId,
  getDeviceName,
  setDeviceName,
} from "@/lib/profile";

// Клубы карьеры для каждого игрока (в хронологическом порядке)
const CAREER_PATHS: Record<number, string[]> = {
  1: ["Барселона", "ПСЖ", "Интер Майами"], // Месси
  2: ["Спортинг", "Манчестер Юнайтед", "Реал Мадрид", "Ювентус", "Манчестер Юнайтед", "Ал-Наср"], // Роналду
  3: ["Спортинг"], // Роналду (юный)
  4: ["Сан-Паулу", "Барселона", "ПСЖ", "Сантос", "Аль-Хиляль", "Сан-Паулу"], // Неймар
  5: ["Динамо Загреб", "Тоттенхэм", "Реал Мадрид"], // Модрич
  6: ["Генк", "Вольфсбург", "Манчестер Сити"], // Де Брюйне
  7: ["Лилль", "Загреби", "Реал Мадрид", "Челси"], // Азар
  8: ["Ренн", "Реал Сосьедад", "Атлетико Мадрид", "Барселона", "Атлетико Мадрид"], // Гризманн
  9: ["Монако", "ПСЖ", "Реал Мадрид"], // Мбаппе
  10: ["Брюгге", "Ред Булл Зальцбург", "Боруссия Д", "Манчестер Сити"], // Холанд
  11: ["Берн", "Ньон"], // Шацкири
  12: ["Минейро", "Севилья", "Барселона", "Ювентус", "Парма", "Коринтианс"], // Дани Алвес
  13: ["Ривер Плейт", "Уэска", "Ливерпуль", "Барселона", "Эвертон", "Коринтианс"], // Маскерано
  14: ["Севилья", "Реал Мадрид", "Пари Сен-Жермен"], // Рамос
  15: ["Флинтшир", "Питерборо", "Лестер", "Лестер Сити", "Астон Вилла"], // Варди
  16: ["Спортинг", "Валенсия", "Барселона", "Эвертон", "Бенфика"], // Андре Гомеш
  17: ["Марсель", "Манчестер Юнайтед", "Ювентус", "Марсель"], // Погба
  18: ["Реал Мадрид", "Боруссия Д", "Интер", "Пари Сен-Жермен"], // Хакиmi
  19: ["Камбур", "Кастор", "Фейеноорд", "Наполи", "ПСЖ", "Ливерпуль"], // Вейналдум
  20: ["Реда Казабланка", "Сент-Этьен", "Саутгемптон", "Саутгемптон", "Ливерпуль", "Бавария", "Саутгемптон", "Аль-Насер"], // Мане
  21: ["Эль-Эзбью", "Базель", "Челси", "Рома", "Ливерпуль"], // Салах
  22: ["Лех", "Лех Познань", "Боруссия Д", "Байер", "Барселона"], // Левандовский
  23: ["Брюгге", "Ред Булл Зальцбург", "Боруссия Д", "Манчестер Сити"], // Холанд (дубликат)
  24: ["Аякс", "Боруссия Д", "Челси", "Байер"], // Кристенсен
  25: ["Копенгаген", "Аякс", "Манчестер Юнайтед"], // Линдлём
  26: ["Данубио", "Атлетико Мадрид", "Интер", "Ретайрмент"], // Годин
  27: ["Атлетико Мадрид", "Манчестер Юнайтед"], // Деген
  28: ["Реал Мадрид", "Порту", "Шахтёр"], // Касилья
  29: ["Шваби Алльгой", "Бавария"], // Нойер
  30: ["Ванкувер Уайткэпс", "Шальке", "Бавария"], // Дэвис
  31: ["Фламенго", "Гремио", "Реал Мадрид"], // Виниус
  32: ["Ривер Плейт", "Манчестер Сити"], // Альварес
  33: ["Вест Хэм", "Арсенал"], // Райс
  34: ["Динамо Киев", "Шахтёр", "Динамо Киев"], // Ярмоленко
  35: ["Динамо Киев", "Ростов", "Манчестер Сити"], // Зинченко
  36: ["Ред Булл Зальцбург", "Ред Булл Лейпциг", "Ливерпуль"], // Собослаи
  37: ["Архентинос Хуниорс", "Севилья", "Наполи", "Лацио", "Ньюэллс Олд Бойз"], // Марадона
  38: ["Сантос", "Коуте", "Нью-Йорк Космос", "Сантос"], // Пеле
  39: ["Аякс", "Барселона", "Футбол Клуб", "Виндаме"], // Кройфф
  40: ["Сент-Этьен", "Ювентус", "Пари Сен-Жермен", "Марсель"], // Платини
  41: ["Кан", "Бордо", "Ювентус", "Реал Мадрид", "Брешия"], // Зидан
  42: ["Динамо Киев", "Ювентус", "Милан", "Челси", "Динуо Киев", "Краснодар"], // Шевченко
  43: ["Торпедо", "Динамо Москва", "ЦСКА", "Реал", "Монако", "Севилья", "Зенит"], // Черышев
  44: ["Анжи", "Динамо Москва", "Зенит", "Анжи", "Зенит"], // Дзюба
  45: ["Шахтёр", "Шахтёр", "Шахтёр", "Шахтёр"], // Цыганков
  46: ["Эвертон", "Эвертон", "Эвертон", "Эвертон"], // Калверт-Льюис
  47: ["Брюгге", "Брюгге", "Брюгге"], // Эффенберг
  48: ["Лиллестрём", "Боруссия Д"], // Беккабек
};

// Очки за угадывание на N-м подсказке
function pointsForGuess(n: number): number {
  const scale = [1000, 800, 650, 500, 350, 200, 100, 50];
  return scale[Math.min(n, scale.length) - 1] ?? 25;
}

function targetForDate(date: Date): Player {
  const d =
    date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  return PLAYERS[d % PLAYERS.length];
}

function dateLabel(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}.${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

export function CareerGame() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const [name, setName] = useState(() => getDeviceName());
  const [revealedClues, setRevealedClues] = useState(0);
  const [input, setInput] = useState("");
  const [guesses, setGuesses] = useState<Array<{ name: string; status: "match" | "close" | "no" }>>([]);
  const [finished, setFinished] = useState(false);
  const [didWin, setDidWin] = useState(false);
  const [points, setPoints] = useState(0);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);

  const today = useMemo(() => new Date(), []);
  const target = useMemo(() => targetForDate(today), [today]);
  const careerPath = CAREER_PATHS[target.id] ?? [target.debut_club, target.current_club];
  const maxClues = Math.min(careerPath.length, 6); // максимум 6 подсказок
  const dateKey = today.toISOString().slice(0, 10);

  // Проверка: уже играл сегодня?
  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    sb.from("career_results")
      .select("points, won")
      .eq("device_id", deviceId)
      .eq("puzzle_date", dateKey)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAlreadyPlayed(true);
          setFinished(true);
          setDidWin(data.won);
          setPoints(data.points);
        }
      });
  }, [deviceId, dateKey]);

  const saveGame = useCallback((g: Array<{ name: string; status: string }>, fin: boolean, w: boolean, pts: number) => {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    sb.from("career_results")
      .upsert(
        { device_id: deviceId, puzzle_date: dateKey, points: pts, won: w },
        { onConflict: "device_id,puzzle_date" }
      );
    localStorage.setItem(`career_daily_${dateKey}`, JSON.stringify({ guesses: g, finished: fin, won: w, points: pts }));
  }, [deviceId, dateKey]);

  const evaluate = useCallback((name: string): "match" | "close" | "no" => {
    const query = name.trim().toLowerCase();
    
    // 1. Точное совпадение (полное имя)
    let p = PLAYERS.find(
      (x) =>
        x.name_ru.toLowerCase() === query ||
        x.name_en.toLowerCase() === query
    );
    
    // 2. Если нет точного — ищем по фамилии (последнее слово)
    if (!p) {
      const lastWord = query.split(" ").pop() || query;
      p = PLAYERS.find(
        (x) =>
          x.name_ru.toLowerCase().endsWith(lastWord) ||
          x.name_en.toLowerCase().endsWith(lastWord)
      );
    }
    
    // 3. Если всё ещё нет — ищем по подстроке
    if (!p) {
      p = PLAYERS.find(
        (x) =>
          x.name_ru.toLowerCase().includes(query) ||
          x.name_en.toLowerCase().includes(query)
      );
    }
    
    if (!p) return "no";
    if (p.id === target.id) return "match";
    const close =
      p.country === target.country ||
      p.position === target.position ||
      Math.abs(p.birth_year - target.birth_year) <= 5 ||
      p.current_club === target.current_club;
    return close ? "close" : "no";
  }, [target]);

  const submit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (finished || !input.trim()) return;
    const status = evaluate(input);
    const next = [...guesses, { name: input.trim(), status }];
    setGuesses(next);
    setInput("");

    if (status === "match") {
      const pts = pointsForGuess(revealedClues);
      setDidWin(true);
      setFinished(true);
      setPoints(pts);
      const cleanName = name.trim() || "Игрок";
      if (cleanName) setDeviceName(cleanName);
      ensureProfile(deviceId, cleanName).then(() =>
        addXp(deviceId, pts, cleanName)
      );
      saveGame(next, true, true, pts);
    } else {
      const newRevealed = revealedClues + 1;
      setRevealedClues(newRevealed);
      
      // Если все подсказки раскрыты — игра окончена
      if (newRevealed >= maxClues) {
        setFinished(true);
        setDidWin(false);
        setPoints(0);
        saveGame(next, true, false, 0);
      }
    }
  }, [input, finished, revealedClues, maxClues, evaluate, guesses, name, deviceId, saveGame]);

  const isToday = true;

  return (
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 text-white">
      {/* Левая колонка: поле игры */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <small className="text-[11px] tracking-[0.2em] text-blue-400/70">
            ЕЖЕДНЕВНАЯ ИГРА · {dateLabel(today)}
          </small>
          <span className="text-xs text-white/40">
            Подсказок: {revealedClues + 1} из {maxClues}
          </span>
        </div>

        <h2 className="mt-3 text-3xl font-black">
          ПУТЬ <em className="font-light italic text-blue-400">ФУТБОЛИСТА</em>
        </h2>
        <p className="mt-2 text-sm text-white/50 max-w-md">
          Перед вами клубы карьеры одного игрока. Угадайте футболиста как можно
          раньше — чем меньше подсказок, тем больше очков.
        </p>

        {/* Поле ввода */}
        <form onSubmit={submit} className="mt-6 flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={finished}
            placeholder="Например: Лионель Месси"
            className="flex-1 rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-base text-white outline-none placeholder:text-white/25 focus:border-blue-500/50 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={finished || !input.trim()}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold px-6 py-3 hover:from-blue-500 hover:to-blue-600 disabled:opacity-30 transition active:scale-[0.97] shadow-lg shadow-blue-900/30"
          >
            ПРОВЕРИТЬ
          </button>
        </form>

        {/* История догадок */}
        <ul className="mt-5 space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {guesses.length === 0 && (
            <li className="text-sm text-white/25">
              Пока нет догадок. Сделайте первую попытку!
            </li>
          )}
          {guesses.map((g, i) => (
            <li
              key={i}
              className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium ${
                g.status === "match"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : g.status === "close"
                  ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                  : "bg-white/3 text-white/40 border border-white/8"
              }`}
            >
              <span>{g.name}</span>
              <span className="text-[11px] tracking-wider">
                {g.status === "match" ? "✓ УГАДАЛ" : g.status === "close" ? "≈ БЛИЗКО" : "✗ МИМО"}
              </span>
            </li>
          ))}
        </ul>

        {/* Результат */}
        {finished && (
          <div
            className={`mt-5 rounded-xl p-4 text-sm ${
              didWin
                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                : "bg-white/5 border border-white/10 text-white/50"
            }`}
          >
            {didWin ? (
              <>
                🏆 <b>Победа!</b> Игрок — <b>{target.name_ru}</b>. Очки: <b className="text-amber-400">+{points}</b>
              </>
            ) : (
              <>
                😔 Не угадано. Это был <b className="text-white/70">{target.name_ru}</b>.
              </>
            )}
          </div>
        )}
      </div>

      {/* Правая колонка: карьерный таймлайн */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 sm:p-6">
        <small className="text-[11px] tracking-[0.2em] text-blue-400/70">
          КАРЬЕРА
        </small>
        <h3 className="mt-2 text-xl font-black text-white">Клубы футболиста</h3>
        <div className="mt-4 relative pl-4">
          {/* Вертикальная линия */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-blue-500/50 via-white/10 to-transparent" />
          <div className="space-y-3">
            {careerPath.slice(0, Math.max(1, revealedClues)).map((club, i) => (
              <div
                key={i}
                className="relative flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 pl-8 transition"
              >
                <span className="absolute left-0 w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs font-black text-blue-300 z-10">
                  {i + 1}
                </span>
                <span className="font-semibold text-white">{club}</span>
              </div>
            ))}
            {/* Скрытые подсказки */}
            {Array.from({ length: maxClues - Math.max(1, revealedClues) }, (_, i) => (
              <div
                key={`hidden-${i}`}
                className="relative flex items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/2 p-3 pl-8 opacity-50"
              >
                <span className="absolute left-0 w-8 h-8 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-sm font-bold text-white/30 z-10">
                  ?
                </span>
                <span className="text-white/30 text-sm">??? (ещё не раскрыто)</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-4 text-[11px] text-white/40">
          <span className="flex items-center gap-1.5">
            <i className="w-3 h-3 rounded bg-emerald-500 inline-block" />
            Совпало
          </span>
          <span className="flex items-center gap-1.5">
            <i className="w-3 h-3 rounded bg-amber-400 inline-block" />
            Близко
          </span>
          <span className="flex items-center gap-1.5">
            <i className="w-3 h-3 rounded bg-white/15 inline-block" />
            Не совпало
          </span>
        </div>
      </div>
    </div>
  );
}
