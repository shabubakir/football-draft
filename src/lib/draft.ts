// Движок ДРАФТА: исторические клубные составы, схемы, турнир.
// База: src/lib/data/squads.json (408 составов, 26 сезонов, 99 клубов).

import rawSquads from "./data/squads.json";

export type SquadPlayer = {
  n: string; // name
  pos: string[]; // positions (GK, CB, LB, RB, DM, CM, AM, RW, LW, ST)
  r: number; // rating
  nat: string; // nation
};

export type Squad = {
  c: string; // club
  s: string; // season
  col: string; // club color
  p: SquadPlayer[];
};

export const SQUADS = rawSquads as unknown as Squad[];

// ---------- Позиции ----------
export const POS_RU: Record<string, string> = {
  GK: "ВРТ",
  CB: "ЦЗ",
  LB: "ЛЗ",
  RB: "ПЗ",
  DM: "ОП",
  CM: "ЦП",
  AM: "АП",
  RW: "ПВ",
  LW: "ЛВ",
  ST: "НП",
};

// Слотов в схеме и допустимые позиции для каждого слота
export type Formation = {
  id: string;
  name: string;
  lines: number;
  slots: string[]; // уникальные ключи слотов (GK, CB, W_L, ST, ...)
  labels: string[]; // русское название каждого слота (ВРТ, ЦЗ, ЛВ, НП, ...)
  slotsPos: string[][]; // допустимые позиции (GK, CB, ...) для каждого слота
};

// Допустимые позиции игроков (по базе): GK, CB, LB, RB, DM, CM, AM, RW, LW, ST.
// Полоса "CB DM CM AM" — центральная ось, взаимозаменяемая; фланги LB/RB/RW/LW — свободнее.
const GK: string[] = ["GK"];
const FB_L: string[] = ["LB", "CB", "DM", "CM", "AM"];
const FB_R: string[] = ["RB", "CB", "DM", "CM", "AM"];
const CB: string[] = ["CB", "DM", "CM"];
const DM: string[] = ["DM", "CB", "CM", "AM"];
const CM: string[] = ["CM", "DM", "CB", "AM"];
const AM: string[] = ["AM", "CM", "DM", "RW", "LW"];
const W_L: string[] = ["LW", "RW", "AM", "CM"];
const W_R: string[] = ["RW", "LW", "AM", "CM"];
const ST: string[] = ["ST", "RW", "LW", "AM", "CM"];

export const FORMATIONS: Formation[] = [
  { id: "433", name: "4–3–3", lines: 3, slots: ["GK", "FB_L", "CB1", "CB2", "FB_R", "DM1", "CM1", "CM2", "W_L", "ST1", "W_R"], labels: ["ВРТ", "ЛЗ", "ЦЗ", "ЦЗ", "ПЗ", "ОП", "ЦП", "ЦП", "ЛВ", "НП", "ПВ"], slotsPos: [GK, FB_L, CB, CB, FB_R, DM, CM, CM, W_L, ST, W_R] },
  { id: "442", name: "4–4–2", lines: 3, slots: ["GK", "FB_L", "CB1", "CB2", "FB_R", "W_L1", "CM1", "CM2", "W_R1", "ST1", "ST2"], labels: ["ВРТ", "ЛЗ", "ЦЗ", "ЦЗ", "ПЗ", "ЛВ", "ЦП", "ЦП", "ПВ", "НП", "НП"], slotsPos: [GK, FB_L, CB, CB, FB_R, W_L, CM, CM, W_R, ST, ST] },
  { id: "4231", name: "4–2–3–1", lines: 4, slots: ["GK", "FB_L", "CB1", "CB2", "FB_R", "DM1", "DM2", "AM1", "AM2", "AM3", "ST1"], labels: ["ВРТ", "ЛЗ", "ЦЗ", "ЦЗ", "ПЗ", "ОП", "ОП", "АП", "АП", "АП", "НП"], slotsPos: [GK, FB_L, CB, CB, FB_R, DM, DM, AM, AM, AM, ST] },
  { id: "424", name: "4–2–4", lines: 3, slots: ["GK", "FB_L", "CB1", "CB2", "FB_R", "DM1", "DM2", "W_L1", "AM1", "W_R1", "ST1"], labels: ["ВРТ", "ЛЗ", "ЦЗ", "ЦЗ", "ПЗ", "ОП", "ОП", "ЛВ", "АП", "ПВ", "НП"], slotsPos: [GK, FB_L, CB, CB, FB_R, DM, DM, W_L, AM, W_R, ST] },
  { id: "352", name: "3–5–2", lines: 4, slots: ["GK", "CB1", "CB2", "CB3", "W_L1", "DM1", "CM1", "CM2", "W_R1", "ST1", "ST2"], labels: ["ВРТ", "ЦЗ", "ЦЗ", "ЦЗ", "ЛВ", "ОП", "ЦП", "ЦП", "ПВ", "НП", "НП"], slotsPos: [GK, CB, CB, CB, W_L, DM, CM, CM, W_R, ST, ST] },
  { id: "532", name: "5–3–2", lines: 3, slots: ["GK", "FB_L", "CB1", "CB2", "CB3", "FB_R", "CM1", "CM2", "CM3", "ST1", "ST2"], labels: ["ВРТ", "ЛЗ", "ЦЗ", "ЦЗ", "ЦЗ", "ПЗ", "ЦП", "ЦП", "ЦП", "НП", "НП"], slotsPos: [GK, FB_L, CB, CB, CB, FB_R, CM, CM, CM, ST, ST] },
  { id: "451", name: "4–5–1", lines: 4, slots: ["GK", "FB_L", "CB1", "CB2", "FB_R", "DM1", "W_L1", "CM1", "W_R1", "CM2", "ST1"], labels: ["ВРТ", "ЛЗ", "ЦЗ", "ЦЗ", "ПЗ", "ОП", "ЛВ", "ЦП", "ПВ", "ЦП", "НП"], slotsPos: [GK, FB_L, CB, CB, FB_R, DM, W_L, CM, W_R, CM, ST] },
  { id: "343", name: "3–4–3", lines: 3, slots: ["GK", "CB1", "CB2", "CB3", "W_L1", "CM1", "CM2", "W_R1", "AM1", "ST1", "ST2"], labels: ["ВРТ", "ЦЗ", "ЦЗ", "ЦЗ", "ЛВ", "ЦП", "ЦП", "ПВ", "АП", "НП", "НП"], slotsPos: [GK, CB, CB, CB, W_L, CM, CM, W_R, AM, ST, ST] },
];

export type Style = "def" | "bal" | "atk";

// ---------- Сила схемы ----------
// Оборона: +защитники, −атаки; Атака: наоборот. Баланс: нейтрально.
const POS_GROUP: Record<string, "def" | "mid" | "att"> = {
  GK: "def", CB: "def", LB: "def", RB: "def", DM: "mid",
  CM: "mid", AM: "att", RW: "att", LW: "att", ST: "att",
};

export function teamRating(xix: SquadPlayer[], style: Style): number {
  if (!xix.length) return 0;
  const avg = xix.reduce((a, p) => a + p.r, 0) / xix.length;
  const att = xix.filter((p) => p.pos.some((x) => POS_GROUP[x] === "att")).length / xix.length;
  const def = xix.filter((p) => p.pos.some((x) => POS_GROUP[x] === "def")).length / xix.length;
  let mod = 0;
  if (style === "def") mod = def * 1.6 - att * 0.6;
  if (style === "atk") mod = att * 1.6 - def * 0.6;
  return Math.round(avg + mod);
}

// ---------- RNG (seeded, повторяемо по seed) ----------
export function makeRng(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x9d2c5180) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function draftSeedForDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `CD-${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}`;
}

// ---------- Драфт: выдача составов ----------
export function randomSquad(rng: () => number, exclude: Set<number>): number {
  const pool = SQUADS.map((_, i) => i).filter((i) => !exclude.has(i));
  return pool[Math.floor(rng() * pool.length)];
}

// ---------- Оппонент турнира: случайный состав с близким рейтингом ----------
export function pickOpponent(rng: () => number, myRating: number, exclude: Set<number>): Squad {
  const close = SQUADS.map((s, i) => ({ s, i, r: teamRating(s.p, "bal") }))
    .filter((x) => !exclude.has(x.i) && Math.abs(x.r - myRating) <= 6)
    .sort((a, b) => b.r - a.r);
  const pick = close.length ? close : SQUADS.map((s, i) => ({ s, i, r: teamRating(s.p, "bal") })).filter((x) => !exclude.has(x.i));
  const chosen = pick[Math.floor(rng() * Math.min(pick.length, 8))];
  return chosen.s;
}

// ---------- Матч: симуляция ----------
export type MatchEvent = {
  min: number;
  team: "me" | "opp";
  type: "goal" | "chance" | "save" | "yellow" | "info";
  text: string;
};

export type MatchResult = {
  gf: number;
  ga: number;
  won: boolean;
  drawn: boolean;
  events: MatchEvent[];
  xg: [number, number];
  poss: number; // % владения моей командой
  shots: [number, number];
  playerRatings: Record<string, number>;
  manOfMatch: { name: string; rating: number } | null;
};

const GOAL_WORDS = ["пробил с игры", "ударом после подачи", "с близкой дистанции", "с игры с краю штрафной", "в касание со штрафного"];
const CHANCE_WORDS = ["опасный удар", "момент у ворот", "пас в разрез", "выход один на один"];
const SAVE_WORDS = ["спас вратарь", "отбил на угловой", "вышел вратарь"];

export function simulateMatch(
  myTeam: SquadPlayer[],
  oppTeam: SquadPlayer[],
  seed: string,
  myStyle: Style
): MatchResult {
  const rng = makeRng(seed);
  const myR = teamRating(myTeam, myStyle);
  const oppR = teamRating(oppTeam, "bal");
  const diff = (myR - oppR) / 100; // примерно -0.3..0.3

  const events: MatchEvent[] = [];
  let gf = 0, ga = 0;
  let xgMe = 0, xgOpp = 0;
  const shots: [number, number] = [0, 0];

  // Целевые голы по xG-логике
  const expMe = Math.max(0.15, 1.35 + diff * 3);
  const expOpp = Math.max(0.15, 1.35 - diff * 3);

  // Поле событий
  for (let min = 1; min <= 90; min++) {
    const pChance = 0.055; // шанс события в минуту
    for (const side of ["me", "opp"] as const) {
      if (rng() > pChance) continue;
      const isMe = side === "me";
      const exp = isMe ? expMe : expOpp;
      const oppRng = rng();
      const isGoal = oppRng < exp * 0.055;
      const minute = min;
      if (isGoal) {
        const scorer = pickScorer(rng, isMe ? myTeam : oppTeam);
        if (isMe) { gf++; shots[0]++; xgMe += 1; } else { ga++; shots[1]++; xgOpp += 1; }
        events.push({ min: minute, team: side, type: "goal", text: `${scorer} — ГОЛ! ${pickWord(rng, GOAL_WORDS)}` });
      } else if (oppRng < exp * 0.14) {
        const who = pickScorer(rng, isMe ? myTeam : oppTeam);
        if (isMe) shots[0]++; else shots[1]++;
        if (isMe) xgMe += 0.32; else xgOpp += 0.32;
        const savey = rng() < 0.55;
        events.push({
          min: minute,
          team: side,
          type: savey ? "save" : "chance",
          text: savey ? `${who} — ${pickWord(rng, SAVE_WORDS)}` : `${who} — ${pickWord(rng, CHANCE_WORDS)}`,
        });
      } else if (rng() < 0.18) {
        const who = pickAny(rng, isMe ? myTeam : oppTeam);
        events.push({ min: minute, team: side, type: "yellow", text: `${who} — жёлтая карточка` });
      }
    }
  }

  // Оценки игроков: базово от рейтинга + результат матча + голы
  const won = gf > ga, drawn = gf === ga;
  const teamMult = won ? 1.06 : drawn ? 0.98 : 0.9;
  const playerRatings: Record<string, number> = {};
  for (const p of myTeam) {
    let score = (p.r / 100) * 3 + 4.2 + (rng() - 0.5) * 0.8;
    const goals = events.filter((e) => e.type === "goal" && e.team === "me" && e.text.startsWith(p.n)).length;
    score += goals * 1.1;
    score *= teamMult;
    playerRatings[p.n] = Math.min(9.9, Math.max(4.0, Math.round(score * 10) / 10));
  }
  const sorted = Object.entries(playerRatings).sort((a, b) => b[1] - a[1]);
  const manOfMatch = sorted.length ? { name: sorted[0][0], rating: sorted[0][1] } : null;

  // Владение: сильнее — больше, но с шумом
  const poss = Math.round(Math.min(68, Math.max(32, 50 + diff * 25 + (rng() - 0.5) * 10)));

  events.sort((a, b) => a.min - b.min);
  events.unshift({ min: 0, team: "me", type: "info", text: "Старт — команды вышли на поле" });

  return { gf, ga, won, drawn, events, xg: [round1(xgMe), round1(xgOpp)], poss, shots, playerRatings, manOfMatch };
}

function pickWord(rng: () => number, arr: string[]): string {
  return arr[Math.floor(rng() * arr.length)];
}
function pickScorer(rng: () => number, team: SquadPlayer[]): string {
  // атакующие чаще
  const att = team.filter((p) => p.pos.some((x) => POS_GROUP[x] !== "def"));
  const pool = att.length ? att : team;
  return pickAny(rng, pool);
}
function pickAny(rng: () => number, team: SquadPlayer[]): string {
  const p = team[Math.floor(rng() * team.length)];
  return p.n;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---------- Турнир: 7 матчей (группа 6 туров + финал) ----------
export type TournamentState = {
  matchDay: number; // 1..7
  finished: boolean;
  place: number | null; // место в группе (после 6 туров)
  champion: boolean;
  opponents: string[]; // названия соперников по турам
  results: Array<{ opp: string; gf: number; ga: number; won: boolean; drawn: boolean }>;
  groupTable: Array<{ name: string; w: number; d: number; l: number; gf: number; ga: number; pts: number }> | null;
};

// Простая группа из 4 команд: я + 3 ИИ-команды; 6 туров (каждый с каждым ×2),
// 1-е место идёт в финал (7-й матч).
export function createTournament(rng: () => number, myRating: number): {
  group: Array<{ name: string; rating: number }>;
  schedule: Array<[number, number]>; // пары индексов команд по турам
} {
  const clubs = ["Реал Мадрид 2013/14", "Бавария 2014/15", "Барселона 2015/16", "Ювентус 2016/17", "ПСЖ 2017/18", "Ливерпуль 2018/19", "Ман Сити 2019/20", "Челси 2020/21", "Байер 2021/22", "Аякс 2018/19", "Интер 2023/24", "Арсенал 2023/24"];
  const pool = clubs.slice().sort(() => rng() - 0.5).slice(0, 3);
  const group = [
    { name: "Ваша команда", rating: myRating },
    ...pool.map((c) => ({ name: c, rating: myRating + Math.floor((rng() - 0.5) * 8) })),
  ];
    // У меня 6 матчей в группе + финал. Фиксированный календарь (я = 0)
  const schedule: Array<[number, number]> = [
    [0, 1], [0, 2], [0, 3], [1, 0], [2, 0], [3, 0],
  ];
  return { group, schedule };
}

export type GroupTeam = { name: string; rating: number };
export type GroupRow = { name: string; w: number; d: number; l: number; gf: number; ga: number; pts: number };

export function groupTableRow(name: string, w: number, d: number, l: number, gf: number, ga: number): GroupRow {
  return { name, w, d, l, gf, ga, pts: w * 3 + d };
}
