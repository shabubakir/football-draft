// ============================================================
// Тесты валидации вопросов «Своя игра»
// ============================================================

import { describe, it, expect } from "vitest";
import {
  SVAYA_QUESTIONS,
  SVAYA_CATEGORIES,
  SVAYA_VALUES,
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

  it("у каждого вопроса есть cat, value, q, answer, explanation", () => {
    for (const q of SVAYA_QUESTIONS) {
      expect(q.id).toBeTruthy();
      expect(Object.keys(SVAYA_CATEGORIES)).toContain(q.cat);
      expect(SVAYA_VALUES).toContain(q.value);
      expect(q.q.trim().length).toBeGreaterThan(2);
      expect(q.answer.length).toBeGreaterThan(0);
      expect(q.explanation.trim().length).toBeGreaterThan(2);
    }
  });

  it("нет дублей (cat, value)", () => {
    const seen = new Set<string>();
    for (const q of SVAYA_QUESTIONS) {
      const key = `${q.cat}:${q.value}`;
      expect(seen.has(key), `Дубль ${key} (${q.id})`).toBe(false);
      seen.add(key);
    }
  });

  it("каждая категория покрывает все 5 номиналов", () => {
    const errs = validateQuestions(SVAYA_QUESTIONS, ALL_CATS);
    const missing = errs.filter((e) => e.code === "MISSING_CAT_VALUE");
    expect(missing, missing.map((m) => m.message).join(", ")).toHaveLength(0);
  });

  it("validateQuestions возвращает 0 ошибок на полном банке", () => {
    expect(isQuestionsValid(SVAYA_QUESTIONS, ALL_CATS)).toBe(true);
  });
});

// ============================================================
describe("validateQuestions: обнаружение ошибок", () => {
  const valid: SvoyaQuestion = {
    id: "x-100", cat: "mixed", value: 100,
    q: "Тестовый вопрос?", answer: ["да"], explanation: "Пояснение.",
  };

  it("ловит пустой ответ", () => {
    const bad: SvoyaQuestion = { ...valid, id: "y-100", answer: [] };
    const errs = validateQuestions([valid, bad]);
    expect(errs.some((e) => e.code === "NO_ANSWER")).toBe(true);
  });

  it("ловит дубликат id", () => {
    const errs = validateQuestions([valid, { ...valid }]);
    expect(errs.some((e) => e.code === "DUP_ID")).toBe(true);
  });

  it("ловит дубль (cat, value)", () => {
    const dup: SvoyaQuestion = { ...valid, id: "z-100" };
    const errs = validateQuestions([valid, dup]);
    expect(errs.some((e) => e.code === "DUP_CAT_VALUE")).toBe(true);
  });

  it("ловит неизвестную категорию", () => {
    const bad: SvoyaQuestion = { ...valid, id: "w-100", cat: "unknown" as SvoyaCategory };
    const errs = validateQuestions([bad]);
    expect(errs.some((e) => e.code === "UNKNOWN_CAT")).toBe(true);
  });

  it("ловит некорректный номинал", () => {
    const bad: SvoyaQuestion = { ...valid, id: "v-100", value: 150 as 100 };
    const errs = validateQuestions([bad]);
    expect(errs.some((e) => e.code === "BAD_VALUE")).toBe(true);
  });

  it("ловит отсутствие вопроса в категории", () => {
    const errs = validateQuestions([valid], ["football"]);
    expect(errs.filter((e) => e.code === "MISSING_CAT_VALUE")).toHaveLength(5);
  });
});

// ============================================================
describe("findQuestion / toPublicQuestion", () => {
  it("findQuestion находит по id", () => {
    const q = findQuestion("fb-100");
    expect(q).toBeTruthy();
    expect(q!.cat).toBe("football");
  });

  it("findQuestion возвращает undefined для неизвестного", () => {
    expect(findQuestion("нет-такого")).toBeUndefined();
  });

  it("toPublicQuestion скрывает answer", () => {
    const q = findQuestion("fb-100")!;
    const pub = toPublicQuestion(q);
    expect((pub as Record<string, unknown>).answer).toBeUndefined();
    expect(pub.q).toBe(q.q);
    expect(pub.id).toBe(q.id);
  });
});
