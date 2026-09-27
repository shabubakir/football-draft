import type { GameThemeId } from "./themes/types";

export type GameCard = {
  href?: string;
  tag: string;
  title: string;
  desc: string;
  footer: string;
  cta: string;
  theme: GameThemeId; // determines the card's visual style
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
    theme: "guess-player",
  },
  {
    href: "/grid/day",
    tag: "ЕЖЕДНЕВНАЯ ИГРА · РЕЙТИНГ",
    title: "СЕТКА ДНЯ",
    desc: "Одна сетка на всех: заполните 9 пересечений, три ошибки — и провал. Результат попадает в общий рейтинг.",
    footer: "ОДНА ИГРА В ДЕНЬ",
    cta: "ИГРАТЬ",
    theme: "grid-9",
  },
  {
    href: "/grid/online",
    tag: "ОНЛАЙН · С ДРУЗЬЯМИ",
    title: "СЕТКА 9 ОНЛАЙН",
    desc: "Найдите соперника и сыграйте в футбольные крестики-нолики по 9 пересечениям.",
    footer: "С ДРУГОМ · БЕЗ ЛИМИТОВ",
    cta: "СОЗДАТЬ КОМНАТУ",
    theme: "grid-9",
  },
  {
    href: "/quiz/online",
    tag: "ОНЛАЙН · ДО 5 ИГРОКОВ",
    title: "ВИКТОРИНА",
    desc: "Футбольные вопросы, 15 секунд на ответ, прямая таблица лидеров. Хост создаёт комнату, друзья подключаются по коду.",
    footer: "10 ВОПРОСОВ · РЕАЛЬНОЕ ВРЕМЯ",
    cta: "ИГРАТЬ В 5-ЕРКУ",
    theme: "quiz",
  },
  {
    href: "/draft",
    tag: "ИСТОРИЧЕСКИЙ ТУРНИР",
    title: "ДРАФТ",
    desc: "Соберите XI из исторических клубных составов (26 сезонов, 99 клубов) и проведите команду через турнир из 7 матчей.",
    footer: "11 ИГРОКОВ · 3 ПЕРЕБРОСА · 7 МАТЧЕЙ",
    cta: "ИГРАТЬ",
    theme: "football-draft",
  },
  {
    href: "/career",
    tag: "ЕЖЕДНЕВНАЯ ИГРА · РЕЙТИНГ",
    title: "ПУТЬ ФУТБОЛИСТА",
    desc: "Угадайте футболиста по клубам его карьеры — чем раньше, тем больше очков.",
    footer: "ЕЖЕДНЕВНЫЙ МАРШРУТ",
    cta: "ИГРАТЬ",
    theme: "career",
  },
  {
    href: "/cs2",
    tag: "СИМУЛЯТОР",
    title: "CS2 КЕЙСЫ",
    desc: "Открывай кейсы CS2 с реальными шансами Valve. 42 кейса, 657 скинов, 1851 нож и перчатки.",
    footer: "РЕАЛЬНЫЕ ШАНСЫ · АНИМАЦИЯ ПРОКРУТА",
    cta: "ПРОКРУТИТЬ",
    theme: "cs2-cases",
  },
  {
    href: "/cs2/aim",
    tag: "MINI-GAME · REACTION",
    title: "CS2 AIM",
    desc: "30 seconds of clicking targets. We measure your reaction speed, accuracy, and best score.",
    footer: "30 SEC · 4 TARGET SIZES",
    cta: "PLAY",
    theme: "cs2-aim",
  },
  {
    href: "/cs2/higher-lower",
    tag: "MINI-GAME · PRICES",
    title: "CS2 HIGHER / LOWER",
    desc: "Two skins from the case database — guess which one is more expensive. 10 rounds, with streaks and bonuses.",
    footer: "10 ROUNDS · REAL PRICES",
    cta: "PLAY",
    theme: "cs2-higher-lower",
  },
  {
    href: "/akinator",
    tag: "MYSTERY · UNLIMITED",
    title: "FOOTBALL AKINATOR",
    desc: "Загадай любого человека, клуб или объект из мира футбола. Я попробую угадать его за несколько вопросов.",
    footer: "БЕСКОНЕЧНЫЕ ВОПРОСЫ · ИСТИННАЯ ЛОГИКА",
    cta: "ИГРАТЬ",
    theme: "akinator",
  },
  {
    href: "/geoguessr",
    tag: "МИНИ-ИГРА · МИР",
    title: "GEOGUESSR LITE",
    desc: "Угадай место на карте по фотографии. 5 раундов. Чем ближе ты поставишь точку — тем больше очков получишь.",
    footer: "5 РАУНДОВ · ВСЕ КОНТИНЕНТЫ · КАЗАХСТАН",
    cta: "ИГРАТЬ",
    theme: "geoguessr",
  },
];
