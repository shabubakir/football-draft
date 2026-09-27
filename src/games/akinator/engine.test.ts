// ============================================================
// TESTS — движок Football Akinator v2
// ============================================================
// Покрытие:
//   1. ЖЁСТКИЙ ФИЛЬТР: is_gk "Да" → остаются только вратари;
//      is_gk "Нет" → вратари исключены.
//   2. ANTI-ERROR: догадка никогда не противоречит жёстким ответам.
//   3. Полный проход (bot отвечает из пропов сущности) для:
//      Rooney, Satpaev, Neuer, Ronaldo, Messi, Haaland,
//      Modrić, Van Dijk, Mbappé.
// ============================================================

import { describe, expect, it } from "vitest";
import type { Answer } from "./types";
import {
  acceptGuess,
  answer,
  currentQuestion,
  newGame,
  rejectGuess,
  safeTopCandidateExport,
  type EngineState,
} from "./engine";
import { ALL_ENTITIES, ENTITY_MAP, QUESTIONS } from "./data";

/** Ответ бота: истина по провам сущности (check() → yes/no/unknown) */
function botAnswer(qId: string, entityId: string): Answer {
  const q = QUESTIONS.find((x) => x.id === qId);
  const e = ENTITY_MAP.get(entityId)!;
  if (!q) return "unknown";
  const res = q.check(e);
  if (res === true) return "yes";
  if (res === false) return "no";
  return "unknown";
}

/** Симуляция полной игры с ботом. Возвращает [состояние, список ошибок] */
function simulate(entityId: string, maxRounds = 60): EngineState {
  let st: EngineState = newGame();
  for (let round = 0; round < maxRounds; round++) {
    if (st.phase === "guessing") {
      if (st.guessId === entityId) return acceptGuess(st);
      st = rejectGuess(st);
      continue;
    }
    if (st.phase === "won" || st.phase === "lost" || st.phase === "surrender") {
      return st;
    }
    const q = currentQuestion(st);
    if (!q) return st;
    st = answer(st, q.id, botAnswer(q.id, entityId));
  }
  return st;
}

describe("HARD FILTER — вратари", () => {
  it("is_gk = Да → в базовых кандидатах только вратари", () => {
    let st = newGame();
    st = answer(st, "is_gk", "yes");

    const goalkeepers = ALL_ENTITIES.filter((e) => e.props.isGoalkeeper);
    const nonGKs = ALL_ENTITIES.filter((e) => e.category === "player" && !e.props.isGoalkeeper);

    for (const gk of goalkeepers) {
      expect(st.candidates, `вратарь ${gk.id} должен остаться`).toContain(gk.id);
    }
    // Все известные НЕ-вратари (check() === false) исключены
    for (const p of nonGKs) {
      const q = QUESTIONS.find((x) => x.id === "is_gk")!;
      if (q.check(p) === false) {
        expect(st.candidates, `${p.id} (не вратарь) должен быть исключён`).not.toContain(p.id);
      }
    }
    expect(st.hardAnswers.is_gk).toBe("yes");
  });

  it("is_gk = Нет → вратари исключены", () => {
    let st = newGame();
    st = answer(st, "is_gk", "no");

    const gkQ = QUESTIONS.find((x) => x.id === "is_gk")!;
    const goalkeepers = ALL_ENTITIES.filter((e) => gkQ.check(e) === true);
    for (const gk of goalkeepers) {
      expect(st.candidates, `вратарь ${gk.id} должен быть исключён`).not.toContain(gk.id);
    }
    expect(st.hardAnswers.is_gk).toBe("no");
  });

  it("is_fw = Да → все вратари исключены", () => {
    let st = newGame();
    st = answer(st, "is_fw", "yes");

    const fwQ = QUESTIONS.find((x) => x.id === "is_fw")!;
    const gks = ALL_ENTITIES.filter((e) => fwQ.check(e) === false && e.props.isGoalkeeper);
    for (const gk of gks) {
      expect(st.candidates, `вратарь ${gk.id} не может быть «нападающим»`).not.toContain(gk.id);
    }
    // и наоборот: все форварды остались
    const fws = ALL_ENTITIES.filter((e) => fwQ.check(e) === true);
    for (const fw of fws) {
      expect(st.candidates, `форвард ${fw.id} должен остаться`).toContain(fw.id);
    }
  });
});

describe("ANTI-ERROR — догадка не противоречит жёстким ответам", () => {
  it("после is_gk=Да топ-кандидат — только вратарь", () => {
    let st = newGame();
    // несколько ответов, чтобы вес распределился
    st = answer(st, "is_gk", "yes");
    st = answer(st, "is_player", "yes");
    st = answer(st, "is_player", "yes") === st ? st : answer(st, "is_player", "yes");
    // заполним пару мягких ответов, чтобы вес не был равномерным
    for (let i = 0; i < 6; i++) {
      const q = currentQuestion(st);
      if (!q) break;
      st = answer(st, q.id, botAnswer(q.id, "neuer"));
    }
    const top = safeTopCandidateExport(st);
    if (top) {
      const e = ENTITY_MAP.get(top.id)!;
      const isGK = QUESTIONS.find((x) => x.id === "is_gk")!.check(e);
      expect(isGK, `кандидат ${e.id} противоречит жёсткому ответу is_gk=Да`).not.toBe(false);
      if (e.category === "player") {
        expect(e.props.isGoalkeeper, `после is_gk=Да кандидат ${e.id} обязан быть вратарём`).toBe(true);
      }
    }
  });

  it("после is_fw=Да топ-кандидат — только нападающий", () => {
    let st = newGame();
    st = answer(st, "is_fw", "yes");
    for (let i = 0; i < 6; i++) {
      const q = currentQuestion(st);
      if (!q) break;
      st = answer(st, q.id, botAnswer(q.id, "haaland"));
    }
    const top = safeTopCandidateExport(st);
    if (top) {
      const e = ENTITY_MAP.get(top.id)!;
      const isFW = QUESTIONS.find((x) => x.id === "is_fw")!.check(e);
      expect(isFW, `кандидат ${e.id} противоречит is_fw=Да`).not.toBe(false);
    }
  });
});

describe("Полный проход — бот отвечает истину", () => {
  const REQUIRED = [
    "rooney",
    "satpaev",
    "neuer",
    "ronaldo",
    "messi",
    "haaland",
    "modric",
    "van_dijk",
    "mbappe",
  ] as const;

  it.each(REQUIRED.map((id) => [ENTITY_MAP.get(id)!.nameEn, id]))(
    "угадывает %s",
    (nameEn, id) => {
      const st = simulate(id);
      expect(st.phase, `фаза=${st.phase}, guessId=${st.guessId}`).toBe("won");
      expect(st.correctId).toBe(id);
    }
  );
});
