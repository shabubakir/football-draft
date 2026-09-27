// ============================================================
// FOOTBALL AKINATOR — типы
// ============================================================

/** Ответ игрока на вопрос */
export type Answer = "yes" | "no" | "maybe_yes" | "maybe_no" | "unknown";

/** Категория сущности */
export type Category =
  | "player" // футболист
  | "coach" // тренер
  | "club" // футбольный клуб
  | "national_team" // сборная
  | "stadium" // стадион
  | "tournament" // турнир (ЧМ, ЛЧ и т.д.)
  | "league" // лига
  | "referee" // судья
  | "position" // позиция на поле
  | "term" // футбольный термин
  | "award" // награда
  | "event"; // футбольное событие

/**
 * Свойство сущности.
 * Значения: boolean | number | string | string[]
 * - string[] означает «принадлежит к любому из» (напр. клубы, страны)
 */
export type PropValue = boolean | number | string | string[];

export interface Entity {
  /** Идентификатор (латиницей, уникально) */
  id: string;
  /** Название на русском */
  name: string;
  /** Название на английском (для поиска) */
  nameEn: string;
  /** Категория */
  category: Category;
  /** Краткое описание (1–2 предложения) */
  blurb: string;
  /** Изображение (URL или путь). Если нет — рендерим заглушку. */
  img?: string;
  /** Цвет категории (hex, для акцентов) */
  color: string;
  /** Свойства. Ключ = id свойства */
  props: Record<string, PropValue>;
  /** Ключевые слова для поиска (латиница, нижний регистр) */
  keywords: string[];
}

/** Вопрос с предикатом над сущностью */
export interface Question {
  id: string;
  /** Текст вопроса на русском */
  text: string;
  /** Категория вопроса (для группировки) */
  group:
    | "general"
    | "player"
    | "club"
    | "team"
    | "coach"
    | "stadium"
    | "tournament"
    | "league"
    | "other";
  /**
   * Предикат: true = «да», false = «нет», null = «н/д».
   * null — у сущности нет данных по этому свойству.
   */
  check: (e: Entity) => boolean | null;
  /**
   * ЖЁСТКИЙ фильтр.
   * Если true, ответ «да»/«нет» полностью исключает кандидатов,
   * противоречащих ответу. «Скорее да»/«скорее нет» остаются мягкими.
   */
  hard?: boolean;
  /** «Вес» вопроса (бонус при прочих равных, необязательно) */
  weight?: number;
}

/** Статистика (localStorage) */
export interface AkinatorStats {
  games: number;
  wins: number;
  losses: number;
  totalQuestions: number;
  /** Минимальное количество вопросов для победы (лучший результат) */
  bestResult: number | null;
  lastPlayed?: string;
}
