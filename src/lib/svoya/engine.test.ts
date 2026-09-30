// ============================================================
// Тесты движка «Своя игра» — все атаки из GAME_PLAN
// ============================================================

import { describe, it, expect } from "vitest";
import {
  applyAction,
  autoAdvance,
  computeResults,
  createRoom,
  turnPlayer,
  normalizeAnswer,
  toPublicRoom,
  type SvoyaRoom,
  type SvoyaCell,
  type SvoyaCategory,
} from "./engine";
import { SVAYA_CATEGORIES, findQuestion } from "./questions";

// ---------- Утилиты тестов ----------

const CATS: SvoyaCategory[] = ["football", "cs2", "movies", "music", "geo"];

function makeBoard(): SvoyaCell[] {
  // 25 ячеек: 5 категорий × 5 номиналов, qId — уникальные
  const cells: SvoyaCell[] = [];
  for (let ci = 0; ci < 5; ci++) {
    for (let v = 1; v <= 5; v++) {
      cells.push({
        cat: CATS[ci],
        value: v * 100,
        qId: `t-${CATS[ci]}-${v * 100}`,
        taken: false,
      });
    }
  }
  return cells;
}

function makeRoom(over: Partial<SvoyaRoom> = {}): SvoyaRoom {
  const base: SvoyaRoom = {
    id: "room-1",
    code: "TEST1",
    status: "lobby",
    hostId: "h1",
    answerSeconds: 20,
    seed: 42,
    categories: CATS,
    players: [
      { id: "h1", name: "Хост", isHost: true, joinedAt: 1000 },
      { id: "p2", name: "Игрок2", isHost: false, joinedAt: 2000 },
    ],
    board: makeBoard(),
    scores: { h1: 0, p2: 0 },
    turnQueue: ["h1", "p2"],
    turnIndex: 0,
    current: null,
    nextAt: null,
    createdAt: new Date(1000).toISOString(),
    ...over,
  };
  return base;
}

const QUESTIONS = new Map(
  ["football-100", "cs2-200"].map((id) => {
    const q = {
      id,
      cat: "football" as const,
      value: 100,
      q: "Вопрос?",
      answer: ["ответ", "alt"],
      explanation: "Пояснение.",
    };
    return [id, q];
  })
);

// ============================================================
describe("createRoom", () => {
  it("создаёт комнату в lobby с хостом", () => {
    const r = createRoom({
      id: "r1", code: "ABC12", hostId: "h1", hostName: "Хост",
      categories: CATS, board: makeBoard(),
    });
    expect(r.status).toBe("lobby");
    expect(r.players).toHaveLength(1);
    expect(r.players[0].isHost).toBe(true);
    expect(r.board).toHaveLength(25);
    expect(r.scores).toEqual({ h1: 0 });
  });
});

// ============================================================
describe("join", () => {
  it("добавляет игрока в лобби", () => {
    const r = makeRoom();
    const res = applyAction(r, { type: "join", playerId: "p3", name: "Три" });
    expect(res.ok).toBe(true);
    expect(res.room.players).toHaveLength(3);
    expect(res.room.turnQueue).toContain("p3");
    expect(res.room.scores.p3).toBe(0);
  });

  it("отклоняет join после старта", () => {
    const r = makeRoom({ status: "board" });
    const res = applyAction(r, { type: "join", playerId: "p3", name: "Три" });
    expect(res.ok).toBe(false);
  });

  it("отклоняет 7-го игрока (лимит 6)", () => {
    const r = makeRoom({
      players: [
        { id: "h1", name: "H", isHost: true, joinedAt: 1 },
        { id: "p2", name: "A", isHost: false, joinedAt: 2 },
        { id: "p3", name: "B", isHost: false, joinedAt: 3 },
        { id: "p4", name: "C", isHost: false, joinedAt: 4 },
        { id: "p5", name: "D", isHost: false, joinedAt: 5 },
        { id: "p6", name: "E", isHost: false, joinedAt: 6 },
      ],
    });
    const res = applyAction(r, { type: "join", playerId: "p7", name: "F" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/полная/i);
  });

  it("отклоняет повторный join", () => {
    const r = makeRoom();
    const res = applyAction(r, { type: "join", playerId: "p2", name: "Дубль" });
    expect(res.ok).toBe(false);
  });
});

// ============================================================
describe("start", () => {
  it("хост начинает с 2+ игроков", () => {
    const r = makeRoom();
    const res = applyAction(r, { type: "start", actorId: "h1" });
    expect(res.ok).toBe(true);
    expect(res.room.status).toBe("board");
    expect(res.room.turnIndex).toBe(0);
  });

  it("не-хост не может начать", () => {
    const r = makeRoom();
    const res = applyAction(r, { type: "start", actorId: "p2" });
    expect(res.ok).toBe(false);
  });

  it("хост не может начать с 1 игроком", () => {
    const r = makeRoom({
      players: [{ id: "h1", name: "H", isHost: true, joinedAt: 1 }],
      turnQueue: ["h1"],
    });
    const res = applyAction(r, { type: "start", actorId: "h1" });
    expect(res.ok).toBe(false);
  });

  it("двойной start отклоняется", () => {
    const r = makeRoom({ status: "board" });
    const res = applyAction(r, { type: "start", actorId: "h1" });
    expect(res.ok).toBe(false);
  });
});

// ============================================================
describe("pick (выбор ячейки)", () => {
  it("игрок со своим ходом выбирает", () => {
    const r = makeRoom({ status: "board" });
    const res = applyAction(r, { type: "pick", actorId: "h1", cat: 0, val: 100 });
    expect(res.ok).toBe(true);
    expect(res.room.status).toBe("question");
    expect(res.room.current?.qId).toBe("t-football-100");
    expect(res.room.board[0].taken).toBe(true);
  });

  it("не-свой ход отклоняется", () => {
    const r = makeRoom({ status: "board" }); // turnIndex=0 → h1
    const res = applyAction(r, { type: "pick", actorId: "p2", cat: 0, val: 100 });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/не ваш ход/i);
  });

  it("двойной выбор отклоняется", () => {
    const r = makeRoom({ status: "board" });
    applyAction(r, { type: "pick", actorId: "h1", cat: 0, val: 100 });
    // Ход переходит p2, но тот же вопрос взят
    const r2 = makeRoom({ status: "board", turnIndex: 1, board: makeBoard().map((c, i) => i === 0 ? { ...c, taken: true, takenBy: "h1" } : c) });
    const res = applyAction(r2, { type: "pick", actorId: "p2", cat: 0, val: 100 });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/уже выбран/i);
  });

  it("выбор вне board-фазы отклоняется", () => {
    const r = makeRoom({ status: "question", current: { cat: 0, val: 100, qId: "x", pickedBy: "h1" } });
    const res = applyAction(r, { type: "pick", actorId: "p2", cat: 1, val: 200 });
    expect(res.ok).toBe(false);
  });

  it("некорректные координаты отклоняются", () => {
    const r = makeRoom({ status: "board" });
    expect(applyAction(r, { type: "pick", actorId: "h1", cat: 9, val: 100 }).ok).toBe(false);
    expect(applyAction(r, { type: "pick", actorId: "h1", cat: 0, val: 999 }).ok).toBe(false);
  });
});

// ============================================================
describe("answer (ответ)", () => {
  it("игрок отвечает на вопрос", () => {
    const r = makeRoom({
      status: "question",
      current: { cat: 0, val: 100, qId: "football-100", pickedBy: "h1" },
    });
    const res = applyAction(r, { type: "answer", actorId: "p2", text: "90" });
    expect(res.ok).toBe(true);
    expect(res.room.current?.answer).toBe("90");
  });

  it("двойной ответ отклоняется", () => {
    const r = makeRoom({
      status: "question",
      current: { cat: 0, val: 100, qId: "football-100", pickedBy: "h1", answer: "уже" },
    });
    const res = applyAction(r, { type: "answer", actorId: "p2", text: "ещё" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/уже дан/i);
  });

  it("ответ вне question-фазы отклоняется", () => {
    const r = makeRoom({ status: "board" });
    const res = applyAction(r, { type: "answer", actorId: "h1", text: "hi" });
    expect(res.ok).toBe(false);
  });

  it("пустой ответ отклоняется", () => {
    const r = makeRoom({
      status: "question",
      current: { cat: 0, val: 100, qId: "x", pickedBy: "h1" },
    });
    const res = applyAction(r, { type: "answer", actorId: "h1", text: "   " });
    expect(res.ok).toBe(false);
  });
});

// ============================================================
describe("verdict (вердикт хоста)", () => {
  it("хост выносит вердикт, очки начисляются", () => {
    const r = makeRoom({
      status: "question",
      current: { cat: 0, val: 300, qId: "x", pickedBy: "h1", answer: "да" },
    });
    const res = applyAction(r, { type: "verdict", actorId: "h1", correct: true });
    expect(res.ok).toBe(true);
    expect(res.room.status).toBe("reveal");
    expect(res.room.scores.h1).toBe(300);
  });

  it("неверный вердикт — штраф", () => {
    const r = makeRoom({
      status: "question",
      current: { cat: 0, val: 300, qId: "x", pickedBy: "h1", answer: "нет" },
    });
    const res = applyAction(r, { type: "verdict", actorId: "h1", correct: false });
    expect(res.room.scores.h1).toBe(-300);
  });

  it("не-хост не может вынести вердикт", () => {
    const r = makeRoom({
      status: "question",
      current: { cat: 0, val: 300, qId: "x", pickedBy: "h1", answer: "да" },
    });
    const res = applyAction(r, { type: "verdict", actorId: "p2", correct: true });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/хост/i);
  });

  it("вердикт без ответа — ошибка", () => {
    const r = makeRoom({ status: "question" });
    const res = applyAction(r, { type: "verdict", actorId: "h1", correct: true });
    expect(res.ok).toBe(false);
  });
});

// ============================================================
describe("skip / timeout", () => {
  it("skip = штраф тому, кто выбрал", () => {
    const r = makeRoom({
      status: "question",
      current: { cat: 0, val: 500, qId: "x", pickedBy: "h1" },
    });
    const res = applyAction(r, { type: "skip", actorId: "h1" });
    expect(res.room.scores.h1).toBe(-500);
    expect(res.room.status).toBe("reveal");
  });

  it("autoAdvance: question timeout → штраф + reveal", () => {
    const past = new Date(Date.now() - 1000);
    const r = makeRoom({
      status: "question",
      current: { cat: 0, val: 400, qId: "x", pickedBy: "h1" },
      nextAt: past.toISOString(),
    });
    const res = autoAdvance(r, new Date());
    expect(res.advanced).toBe(true);
    expect(res.room.status).toBe("reveal");
    expect(res.room.scores.h1).toBe(-400);
  });

  it("autoAdvance: reveal → board (следующий ход)", () => {
    const past = new Date(Date.now() - 1000);
    const r = makeRoom({
      status: "reveal",
      current: { cat: 0, val: 100, qId: "x", pickedBy: "h1", correct: true, revealed: true },
      nextAt: past.toISOString(),
      board: makeBoard().map((c, i) => i === 0 ? { ...c, taken: true, takenBy: "h1" } : c),
    });
    const res = autoAdvance(r, new Date());
    expect(res.advanced).toBe(true);
    expect(res.room.status).toBe("board");
    expect(res.room.turnIndex).toBe(1); // ход p2
  });

  it("autoAdvance: reveal + все вопросы взяты → finished", () => {
    const past = new Date(Date.now() - 1000);
    const r = makeRoom({
      status: "reveal",
      current: { cat: 0, val: 100, qId: "x", pickedBy: "h1", correct: true, revealed: true },
      nextAt: past.toISOString(),
      board: makeBoard().map((c) => ({ ...c, taken: true, takenBy: "h1" })),
    });
    const res = autoAdvance(r, new Date());
    expect(res.room.status).toBe("finished");
  });

  it("autoAdvance: не просрочено — ничего не меняет", () => {
    const future = new Date(Date.now() + 60000);
    const r = makeRoom({ status: "question", nextAt: future.toISOString() });
    const res = autoAdvance(r, new Date());
    expect(res.advanced).toBe(false);
  });
});

// ============================================================
describe("host transfer", () => {
  it("уход хоста → новый хост = первый по joinedAt (детерминированно)", () => {
    const r = makeRoom({
      players: [
        { id: "h1", name: "Хост", isHost: true, joinedAt: 1000 },
        { id: "p2", name: "Второй", isHost: false, joinedAt: 2000 },
        { id: "p3", name: "Третий", isHost: false, joinedAt: 3000 },
      ],
      scores: { h1: 0, p2: 0, p3: 0 },
      turnQueue: ["h1", "p2", "p3"],
    });
    const res = applyAction(r, { type: "leave", playerId: "h1" });
    expect(res.ok).toBe(true);
    expect(res.room.hostId).toBe("p2"); // первый по joinedAt
    expect(res.room.players.find((p) => p.id === "p2")?.isHost).toBe(true);
    expect(res.events).toContain("host-transferred");
  });

  it("явная передача хоста", () => {
    const r = makeRoom();
    const res = applyAction(r, { type: "transfer", actorId: "h1", toPlayerId: "p2" });
    expect(res.ok).toBe(true);
    expect(res.room.hostId).toBe("p2");
  });

  it("не-хост не может передать", () => {
    const r = makeRoom();
    const res = applyAction(r, { type: "transfer", actorId: "p2", toPlayerId: "h1" });
    expect(res.ok).toBe(false);
  });
});

// ============================================================
describe("finish", () => {
  it("хост завершает игру", () => {
    const r = makeRoom({ status: "board" });
    const res = applyAction(r, { type: "finish", actorId: "h1" });
    expect(res.room.status).toBe("finished");
  });
  it("не-хост не может завершить", () => {
    const r = makeRoom({ status: "board" });
    const res = applyAction(r, { type: "finish", actorId: "p2" });
    expect(res.ok).toBe(false);
  });
});

// ============================================================
describe("normalizeAnswer", () => {
  it("нормализует регистр, пробелы, пунктуацию", () => {
    expect(normalizeAnswer("  Реал  Мадрид! ")).toBe("реал мадрид");
    expect(normalizeAnswer("АВГуст.")).toBe("август");
  });
});

// ============================================================
describe("computeResults", () => {
  it("ничья: оба макс = оба победители", () => {
    const r = makeRoom({
      status: "finished",
      scores: { h1: 500, p2: 500 },
    });
    const res = computeResults(r);
    expect(res.every((x) => x.isWinner)).toBe(true);
  });

  it("сортировка по убыванию", () => {
    const r = makeRoom({ status: "finished", scores: { h1: 100, p2: 500 } });
    const res = computeResults(r);
    expect(res[0].playerId).toBe("p2");
    expect(res[0].isWinner).toBe(true);
    expect(res[1].isWinner).toBe(false);
  });
});

// ============================================================
describe("toPublicRoom (анти-утечка)", () => {
  it("до reveal не отдаёт answer", () => {
    const r = makeRoom({
      status: "question",
      current: { cat: 0, val: 100, qId: "x", pickedBy: "h1", answer: "секрет" },
    });
    const pub = toPublicRoom(r);
    expect(pub.current?.answer).toBeUndefined();
    expect(pub.current?.correct).toBeUndefined();
  });

  it("после reveal — отдаёт", () => {
    const r = makeRoom({
      status: "reveal",
      current: { cat: 0, val: 100, qId: "x", pickedBy: "h1", answer: "секрет", correct: true, revealed: true },
    });
    const pub = toPublicRoom(r);
    expect(pub.current?.answer).toBe("секрет");
    expect(pub.current?.correct).toBe(true);
  });
});

// ============================================================
describe("race conditions (идемпотентность autoAdvance)", () => {
  it("два одновременных autoAdvance — второй не ломает", () => {
    const past = new Date(Date.now() - 1000);
    const r = makeRoom({
      status: "reveal",
      current: { cat: 0, val: 100, qId: "x", pickedBy: "h1", correct: true, revealed: true },
      nextAt: past.toISOString(),
      board: makeBoard().map((c, i) => i === 0 ? { ...c, taken: true, takenBy: "h1" } : c),
    });
    const first = autoAdvance(r, new Date());
    expect(first.advanced).toBe(true);
    // Второй вызов на УЖЕ продвинутой комнате: nextAt null → не продвигает
    const second = autoAdvance(first.room, new Date());
    expect(second.advanced).toBe(false);
  });
});

// ============================================================
describe("интеграция: полный игровой цикл", () => {
  it("2 игрока играют до конца (упрощённо)", () => {
    // Создаём комнату
    let r = makeRoom();
    // h1 начинает
    let res = applyAction(r, { type: "start", actorId: "h1" });
    expect(res.ok).toBe(true);
    r = res.room;
    // h1 берёт football-100
    res = applyAction(r, { type: "pick", actorId: "h1", cat: 0, val: 100 });
    expect(res.ok).toBe(true);
    r = res.room;
    // p2 отвечает
    res = applyAction(r, { type: "answer", actorId: "p2", text: "90" });
    expect(res.ok).toBe(true);
    r = res.room;
    // h1 вердикт: верно
    res = applyAction(r, { type: "verdict", actorId: "h1", correct: true });
    expect(res.room.scores.h1).toBe(100);
    r = res.room;
    // autoAdvance: reveal → board (p2 ход)
    const past = new Date(Date.now() - 1000);
    const adv = autoAdvance({ ...r, nextAt: past.toISOString() }, new Date());
    expect(adv.advanced).toBe(true);
    r = adv.room;
    expect(r.status).toBe("board");
    expect(turnPlayer(r)?.id).toBe("p2");
  });
});
