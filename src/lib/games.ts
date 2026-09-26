export type GameCard = {
  href?: string;
  tag: string;
  title: string;
  desc: string;
  footer: string;
  cta: string;
  accent: string; // tailwind class
  disabled?: boolean;
};

export const GAMES: GameCard[] = [
  {
    href: "/guess",
    tag: "ЕЖЕДНЕВНАЯ ИГРА",
    title: "УГАДАЙ ИГРОКА",
    desc: "Найдите загаданного футболиста за 10 попыток по подсказкам.",
    footer: "НОВЫЙ ИГРОК КАЖДЫЙ ДЕНЬ",
    cta: "ИГРАТЬ",
    accent: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    href: "/grid/day",
    tag: "ЕЖЕДНЕВНАЯ ИГРА · РЕЙТИНГ",
    title: "СЕТКА ДНЯ",
    desc: "Одна сетка на всех: заполните 9 пересечений, три ошибки — и провал. Результат попадает в общий рейтинг.",
    footer: "ОДНА ИГРА В ДЕНЬ",
    cta: "ИГРАТЬ",
    accent: "from-sky-500/20 to-sky-500/5",
  },
  {
    href: "/grid/online",
    tag: "ОНЛАЙН · С ДРУЗЬЯМИ",
    title: "СЕТКА 9 ОНЛАЙН",
    desc: "Найдите соперника и сыграйте в футбольные крестики-нолики по 9 пересечениям.",
    footer: "С ДРУГОМ · БЕЗ ЛИМИТОВ",
    cta: "СОЗДАТЬ КОМНАТУ",
    accent: "from-sky-500/20 to-sky-500/5",
  },
  {
    href: "/quiz/online",
    tag: "ОНЛАЙН · ДО 5 ИГРОКОВ",
    title: "ВИКТОРИНА",
    desc: "Футбольные вопросы, 15 секунд на ответ, прямая таблица лидеров. Хост создаёт комнату, друзья подключаются по коду.",
    footer: "10 ВОПРОСОВ · РЕАЛЬНОЕ ВРЕМЯ",
    cta: "ИГРАТЬ В 5-ЕРКУ",
    accent: "from-rose-500/20 to-rose-500/5",
  },
  {
    tag: "СКОРО",
    title: "ДРАФТ",
    desc: "Соберите XI из клубных составов разных эпох и проведите команду через турнир.",
    footer: "ИСТОРИЧЕСКИЙ ТУРНИР",
    cta: "СКОРО",
    accent: "from-amber-500/20 to-amber-500/5",
    disabled: true,
  },
  {
    tag: "СКОРО",
    title: "ПУТЬ ФУТБОЛИСТА",
    desc: "Угадайте футболиста по клубам его карьеры — чем раньше, тем больше очков.",
    footer: "ЕЖЕДНЕВНЫЙ МАРШРУТ",
    cta: "СКОРО",
    accent: "from-violet-500/20 to-violet-500/5",
    disabled: true,
  },
];
