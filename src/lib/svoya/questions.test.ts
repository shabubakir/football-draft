// ============================================================
// Тесты валидации вопросов «Своя игра»
// ============================================================
// 9 категорий × 5 номиналов × 3 раунда = 135 текстовых
// + 15 фото-вопросов (сериалы) = 150 всего.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  SVAYA_QUESTIONS,
  SVAYA_CATEGORIES,
  SVAYA_VALUES,
  SVAYA_ROUNDS,
  validateQuestions,
  isQuestionsValid,
  findQuestion,
  toPublicQuestion,
  type SvoyaQuestion,
  type SvoyaCategory,
} from "./questions";

const ALL_CATS = Object.keys(SVAYA_CATEGORIES) as SvoyaCategory[];

// ============================================================
describe("банк вопросов: структура", () => {
  it("все id уникальны", () => {
    const ids = SVAYA_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("у каждого вопроса есть cat, value, round, q, options, answer, explanation", () => {
    for (const q of SVAYA_QUESTIONS) {
      expect(q.id).toBeTruthy();
      expect(Object.keys(SVAYA_CATEGORIES)).toContain(q.cat);
      expect(SVAYA_VALUES).toContain(q.value);
      expect(SVAYA_ROUNDS).toContain(q.round);
      expect(q.q.trim().length).toBeGreaterThan(2);
      expect(q.options).toHaveLength(4);
      expect(q.answer.length).toBeGreaterThan(0);
      expect(q.explanation.trim().length).toBeGreaterThan(2);
    }
  });

  it("нет дублей (cat, value, round) среди текстовых вопросов", () => {
    const seen = new Set<string>();
    for (const q of SVAYA_QUESTIONS) {
      if (q.photoKind) continue; // фото-вопросы вне сетки
      const key = `${q.cat}:${q.value}:r${q.round}`;
      expect(seen.has(key), `Дубль ${key} (${q.id})`).toBe(false);
      seen.add(key);
    }
  });

  it("каждая категория покрывает все 5 номиналов × 3 раунда", () => {
    const errs = validateQuestions(SVAYA_QUESTIONS, ALL_CATS);
    const missing = errs.filter((e) => e.code === "MISSING_CAT_VALUE");
    expect(missing, missing.map((m) => m.message).join(", ")).toHaveLength(0);
  });

  it("validateQuestions возвращает 0 ошибок на полном банке", () => {
    expect(isQuestionsValid(SVAYA_QUESTIONS, ALL_CATS)).toBe(true);
  });

  it("в банке ровно 150 вопросов (9 × 5 × 3 = 135 + 15 фото)", () => {
    expect(SVAYA_QUESTIONS).toHaveLength(150);
  });

  it("9 категорий в SVAYA_CATEGORIES", () => {
    expect(ALL_CATS).toHaveLength(9);
    expect(ALL_CATS).toContain("series");
  });
});

// ============================================================
describe("validateQuestions: обнаружение ошибок", () => {
  const valid: SvoyaQuestion = {
    id: "x-500-r0", cat: "mixed", value: 500, round: 0,
    q: "Тестовый вопрос?", options: ["Да", "Нет", "Может", "Не знаю"],
    answer: ["да"], explanation: "Пояснение.",
  };

  it("ловит пустой ответ", () => {
    const bad: SvoyaQuestion = { ...valid, id: "y-500-r0", answer: [] };
    const errs = validateQuestions([valid, bad]);
    expect(errs.some((e) => e.code === "NO_ANSWER")).toBe(true);
  });

  it("ловит дубликат id", () => {
    const errs = validateQuestions([valid, { ...valid }]);
    expect(errs.some((e) => e.code === "DUP_ID")).toBe(true);
  });

  it("ловит дубль (cat, value, round)", () => {
    const dup: SvoyaQuestion = { ...valid, id: "z-500-r0" };
    const errs = validateQuestions([valid, dup]);
    expect(errs.some((e) => e.code === "DUP_CAT_VALUE")).toBe(true);
  });

  it("ловит неизвестную категорию", () => {
    const bad: SvoyaQuestion = { ...valid, id: "w-500-r0", cat: "unknown" as SvoyaCategory };
    const errs = validateQuestions([bad]);
    expect(errs.some((e) => e.code === "UNKNOWN_CAT")).toBe(true);
  });

  it("ловит некорректный номинал", () => {
    const bad: SvoyaQuestion = { ...valid, id: "v-500-r0", value: 350 as 500 };
    const errs = validateQuestions([bad]);
    expect(errs.some((e) => e.code === "BAD_VALUE")).toBe(true);
  });

  it("ловит некорректный раунд", () => {
    const bad: SvoyaQuestion = { ...valid, id: "r-500-r9", round: 9 as 0 };
    const errs = validateQuestions([bad]);
    expect(errs.some((e) => e.code === "BAD_VALUE" && e.message.includes("раунд"))).toBe(true);
  });

  it("ловит отсутствие вопроса в категории (5 × 3 = 15)", () => {
    const errs = validateQuestions([valid], ["football"]);
    expect(errs.filter((e) => e.code === "MISSING_CAT_VALUE")).toHaveLength(15);
  });

  it("ловит неверное количество вариантов (≠ 4)", () => {
    const bad3: SvoyaQuestion = { ...valid, id: "y-500-r0", options: ["А", "Б", "В"] };
    const errs = validateQuestions([valid, bad3]);
    expect(errs.some((e) => e.code === "BAD_OPTIONS")).toBe(true);
  });

  it("ловит пустой вариант в options", () => {
    const bad: SvoyaQuestion = { ...valid, id: "y-500-r0", options: ["Да", "", "Нет", "Может"] };
    const errs = validateQuestions([valid, bad]);
    expect(errs.some((e) => e.code === "EMPTY_TEXT" && e.message.includes("[1]"))).toBe(true);
  });

  it("ловит дубликаты в options", () => {
    const bad: SvoyaQuestion = { ...valid, id: "y-500-r0", options: ["Да", "Нет", "Да", "Может"] };
    const errs = validateQuestions([valid, bad]);
    expect(errs.some((e) => e.code === "BAD_OPTIONS" && e.message.includes("Дубликаты"))).toBe(true);
  });

  it("ловит несоответствие options[0] и answer[0] (OPT_LEAK)", () => {
    const bad: SvoyaQuestion = {
      ...valid, id: "y-500-r0",
      options: ["Совсем другое", "Да", "Нет", "Может"],
      answer: ["да"],
    };
    const errs = validateQuestions([valid, bad]);
    expect(errs.some((e) => e.code === "OPT_LEAK")).toBe(true);
  });

  it("полный банк: все вопросы имеют ровно 4 уникальных варианта", () => {
    for (const q of SVAYA_QUESTIONS) {
      expect(q.options, `${q.id}: options.length`).toHaveLength(4);
      const norm = q.options.map((o) => o.trim().toLowerCase());
      expect(new Set(norm).size, `${q.id}: дубликаты`).toBe(4);
    }
  });

  it("полный банк: options[0] соответствует answer[0]", () => {
    for (const q of SVAYA_QUESTIONS) {
      const opt0 = q.options[0].trim().toLowerCase();
      const ans0 = q.answer[0].trim().toLowerCase();
      expect(opt0.includes(ans0) || ans0.includes(opt0), `${q.id}: options[0]="${q.options[0]}" vs answer[0]="${q.answer[0]}"`).toBe(true);
    }
  });
});

// ============================================================
describe("фото-вопросы (сериалы)", () => {
  it("есть 15 фото-вопросов (srs-photo-0..14)", () => {
    const photo = SVAYA_QUESTIONS.filter((q) => q.id.startsWith("srs-photo-"));
    expect(photo).toHaveLength(15);
  });

  it("у всех фото-вопросов есть emoji-фолбэк", () => {
    const photo = SVAYA_QUESTIONS.filter((q) => q.id.startsWith("srs-photo-"));
    for (const q of photo) {
      expect(q.emoji, `${q.id}: нет emoji`).toBeTruthy();
    }
  });

  it("у фото-вопросов есть photoKind (show | character)", () => {
    const photo = SVAYA_QUESTIONS.filter((q) => q.id.startsWith("srs-photo-"));
    for (const q of photo) {
      expect(["show", "character"]).toContain(q.photoKind);
    }
  });

  it("у фото-вопросов cat === 'series'", () => {
    const photo = SVAYA_QUESTIONS.filter((q) => q.id.startsWith("srs-photo-"));
    for (const q of photo) {
      expect(q.cat).toBe("series");
    }
  });
});

// ============================================================
describe("findQuestion / toPublicQuestion", () => {
  it("findQuestion находит по id (fb-500-r0)", () => {
    const q = findQuestion("fb-500-r0");
    expect(q).toBeTruthy();
    expect(q!.cat).toBe("football");
    expect(q!.value).toBe(500);
    expect(q!.round).toBe(0);
  });

  it("findQuestion находит fb-2500-r2", () => {
    const q = findQuestion("fb-2500-r2");
    expect(q).toBeTruthy();
    expect(q!.value).toBe(2500);
    expect(q!.round).toBe(2);
  });

  it("findQuestion находит фото-вопрос (srs-photo-0)", () => {
    const q = findQuestion("srs-photo-0");
    expect(q).toBeTruthy();
    expect(q!.cat).toBe("series");
    expect(q!.emoji).toBeTruthy();
  });

  it("findQuestion возвращает undefined для неизвестного", () => {
    expect(findQuestion("нет-такого")).toBeUndefined();
  });

  it("toPublicQuestion скрывает answer, но сохраняет options", () => {
    const q = findQuestion("fb-500-r0")!;
    const pub = toPublicQuestion(q);
    expect((pub as Record<string, unknown>).answer).toBeUndefined();
    expect(pub.options).toHaveLength(4);
    expect(pub.q).toBe(q.q);
    expect(pub.id).toBe(q.id);
  });

  it("все значения в диапазоне 500–2500", () => {
    for (const q of SVAYA_QUESTIONS) {
      expect(SVAYA_VALUES).toContain(q.value);
    }
  });
});
