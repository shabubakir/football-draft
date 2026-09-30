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
  normalizeRoom,
  valueIndex,
  cellIndex,
  type SvoyaRoom,
  type SvoyaCell,
  type SvoyaCategory,
  type SvoyaMode,
} from "./engine";
import { SVAYA_VALUES, SVAYA_CATEGORIES, findQuestion } from "./questions";

// ---------- Утилиты тестов ----------

const CATS5: SvoyaCategory[] = ["football", "cs2", "movies", "music", "geo"];
const CATS3: SvoyaCategory[] = ["football", "cs2", "movies"];

function makeBoard(cats: SvoyaCategory[] = CATS5): SvoyaCell[] {
  // cats × 5 номиналов (500/1000/1500/2000/2500)
  const cells: SvoyaCell[] = [];
  for (let ci = 0; ci < cats.length; ci++) {
    for (let v = 0; v < 5; v++) {
      cells.push({
        cat: cats[ci],
        value: SVAYA_VALUES[v],
        qId: `t-${cats[ci]}-${SVAYA_VALUES[v]}`,
        taken: false,
      });
    }
  }
  return cells;
}

function makeRoom(over: Partial<SvoyaRoom> = {}): SvoyaRoom {
  const cats = over.categories ?? CATS5;
  const mode = over.mode ?? 25;
  const base: SvoyaRoom = {
    id: "room-1",
    code: "TEST1",
    status: "lobby",
    hostId: "h1",
    answerSeconds: 20,
    mode,
    seed: 42,
    categories: cats,
    players: [
      { id: "h1", name: "Хост", isHost: true, joinedAt: 1000 },
      { id: "p2", name: "Игрок2", isHost: false, joinedAt: 2000 },
    ],
    board: makeBoard(cats),
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

// ============================================================
describe("valueIndex / cellIndex (новая шкала 500–2500)", () => {
  it("valueIndex маппит 500..2500 → 0..4", () => {
    expect(valueIndex(500)).toBe(0);
    expect(valueIndex(1000)).toBe(1);
    expect(valueIndex(1500)).toBe(2);
    expect(valueIndex(2000)).toBe(3);
    expect(valueIndex(2500)).toBe(4);
  });

  it("cellIndex для cat=1, val=1500 → 1*5+2=7", () => {
    expect(cellIndex(1, 1500)).toBe(7);
  });
});

// ============================================================
describe("normalizeRoom (backwards-compat)", () => {
  it("старая комната без mode → mode=25", () => {
    const raw = { id: "x", code: "ABC", status: "lobby", hostId: "h", answerSeconds: 20, categories: CATS5, players: [], board: [], scores: {}, turnQueue: [], turnIndex: 0, current: null, nextAt: null, createdAt: "" };
    const r = normalizeRoom(raw);
    expect(r.mode).toBe(25);
  });

  it("mode=15 сохраняется", () => {
    const raw = { id: "x", code: "ABC", status: "lobby", hostId: "h", answerSeconds: 20, mode: 15, categories: CATS3, players: [], board: [], scores: {}, turnQueue: [], turnIndex: 0, current: null, nextAt: null, createdAt: "" };
    const r = normalizeRoom(raw);
    expect(r.mode).toBe(15);
  });
});

// ============================================================
describe("createRoom", () => {
  it("создаёт комнату в lobby с хостом (25 вопросов)", () => {
    const r = createRoom({
      id: "r1", code: "ABC12", hostId: "h1", hostName: "Хост",
      categories: CATS5, board: makeBoard(CATS5),
    });
    expect(r.status).toBe("lobby");
    expect(r.mode).toBe(25);
    expect(r.players).toHaveLength(1);
    expect(r.board).toHaveLength(25);
    expect(r.categories).toHaveLength(5);
  });

  it("создаёт комнату 15 вопросов (3 категории)", () => {
    const r = createRoom({
      id: "r2", code: "DEF34", hostId: "h1", hostName: "Хост",
      categories: CATS3, board: makeBoard(CATS3), mode: 15,
    });
    expect(r.mode).toBe(15);
    expect(r.board).toHaveLength(15);
    expect(r.categories).toHaveLength(3);
  });

  it("mode=15 ограничивает категории до 3", () => {
    const r = createRoom({
      id: "r3", code: "GHI56", hostId: "h1", hostName: "Хост",
      categories: CATS5, board: makeBoard(CATS3), mode: 15,
    });
    expect(r.categories).toHaveLength(3);
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

  it("гость получает режим комнаты (mode)", () => {
    const r = makeRoom({ mode: 15, categories: CATS3, board: makeBoard(CATS3) });
    const res = applyAction(r, { type: "join", playerId: "p3", name: "Гость" });
    expect(res.ok).toBe(true);
    expect(res.room.mode).toBe(15);
    expect(res.room.categories).toHaveLength(3);
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
  it("игрок со своим ходом выбирает (500)", () => {
    const r = makeRoom({ status: "board" });
    const res = applyAction(r, { type: "pick", actorId: "h1", cat: 0, val: 500 });
    expect(res.ok).toBe(true);
    expect(res.room.status).toBe("question");
    expect(res.room.current?.qId).toBe("t-football-500");
    expect(res.room.board[0].taken).toBe(true);
  });

  it("выбор 2500 (последний столбец)", () => {
    const r = makeRoom({ status: "board" });
    const res = applyAction(r, { type: "pick", actorId: "h1", cat: 0, val: 2500 });
    expect(res.ok).toBe(true);
    expect(res.room.current?.qId).toBe("t-football-2500");
  });

  it("не-свой ход отклоняется", () => {
    const r = makeRoom({ status: "board" });
    const res = applyAction(r, { type: "pick", actorId: "p2", cat: 0, val: 500 });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/не ваш ход/i);
  });

  it("двойной выбор отклоняется", () => {
    const r = makeRoom({ status: "board" });
    const r2 = makeRoom({ status: "board", turnIndex: 1, board: makeBoard().map((c, i) => i === 0 ? { ...c, taken: true, takenBy: "h1" } : c) });
    const res = applyAction(r2, { type: "pick", actorId: "p2", cat: 0, val: 500 });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/уже выбран/i);
  });

  it("выбор вне board-фазы отклоняется", () => {
    const r = makeRoom({ status: "question", current: { cat: 0, val: 500, qId: "x", pickedBy: "h1", answers: {} } });
    const res = applyAction(r, { type: "pick", actorId: "p2", cat: 1, val: 1000 });
    expect(res.ok).toBe(false);
  });

  it("некорректные координаты отклоняются", () => {
    const r = makeRoom({ status: "board" });
    expect(applyAction(r, { type: "pick", actorId: "h1", cat: 9, val: 500 }).ok).toBe(false);
    expect(applyAction(r, { type: "pick", actorId: "h1", cat: 0, val: 999 }).ok).toBe(false);
    expect(applyAction(r, { type: "pick", actorId: "h1", cat: 0, val: 350 }).ok).toBe(false);
  });

  it("15-режим: cat=3 отклоняется (только 3 категории)", () => {
    const r = makeRoom({ status: "board", mode: 15, categories: CATS3, board: makeBoard(CATS3) });
    const res = applyAction(r, { type: "pick", actorId: "h1", cat: 3, val: 500 });
    expect(res.ok).toBe(false);
  });
});

// ============================================================
describe("answer (выбор варианта — серверная проверка, все игроки)", () => {
  it("правильный вариант (optionId 0) → +1500, вопрос остаётся открытым", () => {
    const r = makeRoom({
      status: "question",
      current: { cat: 0, val: 1500, qId: "football-1500", pickedBy: "h1", answers: {} },
    });
    const res = applyAction(r, { type: "answer", actorId: "p2", optionId: 0 });
    expect(res.ok).toBe(true);
    expect(res.room.status).toBe("question");
    expect(res.room.current?.answers.p2).toEqual({ optionId: 0, correct: true });
    expect(res.room.scores.p2).toBe(1500);
  });

  it("неправильный вариант (optionId 1) → −2000", () => {
    const r = makeRoom({
      status: "question",
      current: { cat: 0, val: 2000, qId: "football-2000", pickedBy: "h1", answers: {} },
    });
    const res = applyAction(r, { type: "answer", actorId: "p2", optionId: 1 });
    expect(res.ok).toBe(true);
    expect(res.room.current?.answers.p2).toEqual({ optionId: 1, correct: false });
    expect(res.room.scores.p2).toBe(-2000);
  });

  it("все игроки ответили → вопрос сразу закрывается (reveal)", () => {
    const r = makeRoom({
      status: "question",
      players: [
        { id: "h1", name: "Хост", isHost: true, joinedAt: 1000 },
        { id: "p2", name: "Игрок2", isHost: false, joinedAt: 2000 },
        { id: "p3", name: "Игрок3", isHost: false, joinedAt: 3000 },
      ],
      scores: { h1: 0, p2: 0, p3: 0 },
      current: { cat: 0, val: 1000, qId: "x", pickedBy: "h1", answers: {} },
    });
    let res = applyAction(r, { type: "answer", actorId: "h1", optionId: 0 });
    expect(res.room.status).toBe("question");
    res = applyAction(res.room, { type: "answer", actorId: "p2", optionId: 1 });
    expect(res.room.status).toBe("question");
    res = applyAction(res.room, { type: "answer", actorId: "p3", optionId: 0 });
    expect(res.room.status).toBe("reveal");
  });

  it("двойной ответ от того же игрока отклоняется", () => {
    const r = makeRoom({
      status: "question",
      current: { cat: 0, val: 500, qId: "football-500", pickedBy: "h1", answers: { h1: { optionId: 0, correct: true } } },
    });
    const res = applyAction(r, { type: "answer", actorId: "h1", optionId: 2 });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/уже ответили/i);
    expect(res.room.scores.h1).toBe(0);
  });

  it("повторная отправка не меняет счёт", () => {
    const r = makeRoom({
      status: "question",
      current: { cat: 0, val: 1500, qId: "x", pickedBy: "h1", answers: { p2: { optionId: 1, correct: false } } },
      scores: { h1: 0, p2: -1500 },
    });
    const res = applyAction(r, { type: "answer", actorId: "p2", optionId: 0 });
    expect(res.ok).toBe(false);
    expect(res.room.scores.p2).toBe(-1500);
  });

  it("ответ вне question-фазы отклоняется", () => {
    const r = makeRoom({ status: "board" });
    const res = applyAction(r, { type: "answer", actorId: "h1", optionId: 0 });
    expect(res.ok).toBe(false);
  });

  it("игрок вне комнаты не может ответить", () => {
    const r = makeRoom({
      status: "question",
      current: { cat: 0, val: 500, qId: "x", pickedBy: "h1", answers: {} },
    });
    const res = applyAction(r, { type: "answer", actorId: "ghost", optionId: 0 });
    expect(res.ok).toBe(false);
  });
});

// ============================================================
describe("skip / timeout", () => {
  it("skip = штраф −2500 тому, кто выбрал", () => {
    const r = makeRoom({
      status: "question",
      current: { cat: 0, val: 2500, qId: "x", pickedBy: "h1", answers: {} },
    });
    const res = applyAction(r, { type: "skip", actorId: "h1" });
    expect(res.room.scores.h1).toBe(-2500);
    expect(res.room.status).toBe("reveal");
  });

  it("autoAdvance: question timeout → штраф + reveal", () => {
    const past = new Date(Date.now() - 1000);
    const r = makeRoom({
      status: "question",
      current: { cat: 0, val: 1500, qId: "x", pickedBy: "h1", answers: {} },
      nextAt: past.toISOString(),
    });
    const res = autoAdvance(r, new Date());
    expect(res.advanced).toBe(true);
    expect(res.room.status).toBe("reveal");
    expect(res.room.scores.h1).toBe(-1500);
  });

  it("autoAdvance: question timeout с уже ответившими — их очки не трогаются", () => {
    const past = new Date(Date.now() - 1000);
    const r = makeRoom({
      status: "question",
      current: {
        cat: 0, val: 2000, qId: "x", pickedBy: "h1",
        answers: { p2: { optionId: 0, correct: true } },
      },
      scores: { h1: 0, p2: 2000 },
      nextAt: past.toISOString(),
    });
    const res = autoAdvance(r, new Date());
    expect(res.room.status).toBe("reveal");
    expect(res.room.scores.p2).toBe(2000);
    expect(res.room.scores.h1).toBe(-2000);
  });

  it("autoAdvance: reveal → board (следующий ход)", () => {
    const past = new Date(Date.now() - 1000);
    const r = makeRoom({
      status: "reveal",
      current: { cat: 0, val: 500, qId: "x", pickedBy: "h1", answers: {} },
      nextAt: past.toISOString(),
      board: makeBoard().map((c, i) => i === 0 ? { ...c, taken: true, takenBy: "h1" } : c),
    });
    const res = autoAdvance(r, new Date());
    expect(res.advanced).toBe(true);
    expect(res.room.status).toBe("board");
    expect(res.room.turnIndex).toBe(1);
  });

  it("autoAdvance: reveal + все вопросы взяты (25) → finished", () => {
    const past = new Date(Date.now() - 1000);
    const r = makeRoom({
      status: "reveal",
      current: { cat: 0, val: 500, qId: "x", pickedBy: "h1", answers: {} },
      nextAt: past.toISOString(),
      board: makeBoard().map((c) => ({ ...c, taken: true, takenBy: "h1" })),
    });
    const res = autoAdvance(r, new Date());
    expect(res.room.status).toBe("finished");
  });

  it("autoAdvance: 15-режим + все 15 взяты → finished", () => {
    const past = new Date(Date.now() - 1000);
    const r = makeRoom({
      status: "reveal",
      mode: 15,
      categories: CATS3,
      current: { cat: 0, val: 500, qId: "x", pickedBy: "h1", answers: {} },
      nextAt: past.toISOString(),
      board: makeBoard(CATS3).map((c) => ({ ...c, taken: true, takenBy: "h1" })),
    });
    const res = autoAdvance(r, new Date());
    expect(res.room.status).toBe("finished");
  });
});

// ============================================================
describe("host transfer", () => {
  it("уход хоста → новый хост = первый по joinedAt", () => {
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
    expect(res.room.hostId).toBe("p2");
    expect(res.room.players.find((p) => p.id === "p2")?.isHost).toBe(true);
    expect(res.events).toContain("host-transferred");
  });

  it("явная передача хоста", () => {
    const r = makeRoom();
    const res = applyAction(r, { type: "transfer", actorId: "h1", toPlayerId: "p2" });
    expect(res.ok).toBe(true);
    expect(res.room.hostId).toBe("p2");
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
describe("computeResults", () => {
  it("ничья: оба макс = оба победители", () => {
    const r = makeRoom({
      status: "finished",
      scores: { h1: 2500, p2: 2500 },
    });
    const res = computeResults(r);
    expect(res.every((x) => x.isWinner)).toBe(true);
  });

  it("сортировка по убыванию", () => {
    const r = makeRoom({ status: "finished", scores: { h1: 1000, p2: 5000 } });
    const res = computeResults(r);
    expect(res[0].playerId).toBe("p2");
    expect(res[0].isWinner).toBe(true);
    expect(res[1].isWinner).toBe(false);
  });
});

// ============================================================
describe("toPublicRoom (анти-утечка + mode)", () => {
  it("включает mode в публичный payload", () => {
    const r = makeRoom({ mode: 15, categories: CATS3, board: makeBoard(CATS3) });
    const pub = toPublicRoom(r);
    expect(pub.mode).toBe(15);
  });

  it("по умолчанию 25", () => {
    const r = makeRoom();
    const pub = toPublicRoom(r);
    expect(pub.mode).toBe(25);
  });
});

// ============================================================
describe("race conditions (идемпотентность autoAdvance)", () => {
  it("два одновременных autoAdvance — второй не ломает", () => {
    const past = new Date(Date.now() - 1000);
    const r = makeRoom({
      status: "reveal",
      current: { cat: 0, val: 500, qId: "x", pickedBy: "h1", answers: {} },
      nextAt: past.toISOString(),
      board: makeBoard().map((c, i) => i === 0 ? { ...c, taken: true, takenBy: "h1" } : c),
    });
    const first = autoAdvance(r, new Date());
    expect(first.advanced).toBe(true);
    const second = autoAdvance(first.room, new Date());
    expect(second.advanced).toBe(false);
  });
});

// ============================================================
describe("интеграция: полный игровой цикл", () => {
  it("2 игрока: 25-режим (упрощённо)", () => {
    let r = makeRoom();
    r = applyAction(r, { type: "start", actorId: "h1" }).room;
    r = applyAction(r, { type: "pick", actorId: "h1", cat: 0, val: 1000 }).room;
    let res = applyAction(r, { type: "answer", actorId: "p2", optionId: 0 });
    expect(res.room.scores.p2).toBe(1000);
    expect(res.room.status).toBe("question");
    res = applyAction(res.room, { type: "answer", actorId: "h1", optionId: 0 });
    expect(res.room.status).toBe("reveal");
    const past = new Date(Date.now() - 1000);
    const adv = autoAdvance({ ...res.room, nextAt: past.toISOString() }, new Date());
    expect(adv.advanced).toBe(true);
    expect(adv.room.status).toBe("board");
    expect(turnPlayer(adv.room)?.id).toBe("p2");
  });

  it("2 игрока: 15-режим (3 категории, 15 ячеек)", () => {
    let r = makeRoom({ mode: 15, categories: CATS3, board: makeBoard(CATS3) });
    expect(r.board).toHaveLength(15);
    r = applyAction(r, { type: "start", actorId: "h1" }).room;
    r = applyAction(r, { type: "pick", actorId: "h1", cat: 2, val: 2500 }).room;
    expect(r.status).toBe("question");
    let res = applyAction(r, { type: "answer", actorId: "p2", optionId: 1 });
    expect(res.room.scores.p2).toBe(-2500);
    res = applyAction(res.room, { type: "answer", actorId: "h1", optionId: 0 });
    expect(res.room.scores.h1).toBe(2500);
    expect(res.room.status).toBe("reveal");
  });

  it("2 игрока: неправильный ответ → штраф", () => {
    let r = makeRoom();
    r = applyAction(r, { type: "start", actorId: "h1" }).room;
    r = applyAction(r, { type: "pick", actorId: "h1", cat: 0, val: 1500 }).room;
    let res = applyAction(r, { type: "answer", actorId: "p2", optionId: 2 });
    expect(res.room.scores.p2).toBe(-1500);
    res = applyAction(res.room, { type: "answer", actorId: "h1", optionId: 0 });
    expect(res.room.scores.h1).toBe(1500);
    expect(res.room.status).toBe("reveal");
  });
});
