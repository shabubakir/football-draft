"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FORMATIONS,
  SQUADS,
  POS_RU,
  teamRating,
  makeRng,
  draftSeedForDate,
  randomSquad,
  pickOpponent,
  simulateMatch,
  createTournament,
  type Squad,
  type SquadPlayer,
  type Formation,
  type Style,
  type MatchResult,
  type GroupRow,
} from "@/lib/draft";
import { addXp, ensureProfile, getDeviceId, getDeviceName, XP_KEYS } from "@/lib/profile";
import { ProfileBadge } from "@/components/profile-badge";
import { useProgression } from "@/lib/progression/use-progression";

const MAX_REROLLS = 3;
const TOTAL_MATCHES = 7;

type Phase = "scheme" | "draft" | "tournament" | "finished";

type Placed = { player: SquadPlayer; squadIdx: number };

export function DraftGame() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const [phase, setPhase] = useState<Phase>("scheme");
  const [formation, setFormation] = useState<Formation>(FORMATIONS[0]);
  const [style, setStyle] = useState<Style>("bal");
  const [seed] = useState(() => draftSeedForDate(new Date()));
  const [xpGained, setXpGained] = useState(0);
  const { reportResult } = useProgression();

  // ---------- Фаза драфта ----------
  const [squadIdx, setSquadIdx] = useState(0);
  const [usedSquads, setUsedSquads] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number | null>(null); // индекс игрока в выпавшем составе
  const [placed, setPlaced] = useState<Record<string, Placed>>({});
  const [rerolls, setRerolls] = useState(MAX_REROLLS);
  const [replaced, setReplaced] = useState<string | null>(null); // слот, которому ищем замену

  // ---------- Фаза турнира ----------
  const [tournament, setTournament] = useState<ReturnType<typeof createTournament> | null>(null);
  const [matchDay, setMatchDay] = useState(0); // 0..6 матчей в группе сыграно
  const [myGroup, setMyGroup] = useState({ w: 0, d: 0, l: 0, gf: 0, ga: 0 });
  const [aiGroup, setAiGroup] = useState<Record<string, GroupRow>>({});
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchLive, setMatchLive] = useState<MatchResult | null>(null);
  const [champion, setChampion] = useState(false);
  const [finalResult, setFinalResult] = useState<MatchResult | null>(null);
  const [finalOpp, setFinalOpp] = useState<Squad | null>(null);
  const [finalPlayed, setFinalPlayed] = useState(false);
  const finalRan = useRef(false);

  const placedCount = Object.keys(placed).length;
  const myXi = FORMATIONS.find((f) => f.id === formation.id)!.slots
    .map((slot) => placed[slot]?.player)
    .filter(Boolean) as SquadPlayer[];

  const currentSquad = SQUADS[squadIdx];

  // ---------- Логика драфта ----------
  const rollSquad = (isReroll: boolean, excludeExtra = -1) => {
    const rng = makeRng(seed + ":" + String(Date.now()) + ":" + squadIdx);
    const used = new Set(usedSquads);
    if (excludeExtra >= 0) used.add(excludeExtra);
    const next = randomSquad(rng, used);
    setSquadIdx(next);
    setUsedSquads((prev) => new Set(prev).add(next));
    setSelected(null);
    setReplaced(null);
    if (isReroll) setRerolls((r) => r - 1);
  };

  // Авто-переброс: новый состав без расхода переборов (когда в текущем нет подходящего)
  const autoRoll = () => {
    const rng = makeRng(seed + ":auto" + String(Date.now()) + ":" + squadIdx);
    const used = new Set(usedSquads);
    used.add(squadIdx);
    const next = randomSquad(rng, used);
    setSquadIdx(next);
    setUsedSquads((prev) => new Set(prev).add(next));
    setSelected(null);
  };

  const pickSlot = (slotKey: string) => {
    if (selected === null) return;
    const player = currentSquad.p[selected];
    const slotPos = formation.slotsPos[formation.slots.indexOf(slotKey)];
    if (!player.pos.some((p) => slotPos.includes(p))) return;
    const nextPlaced: Record<string, Placed> = { ...placed };
    nextPlaced[slotKey] = { player, squadIdx };
    setPlaced(nextPlaced);
    setSelected(null);
    // после каждого пика — новый состав (как на championsdraft.ru)
    rollSquad(false, squadIdx);
    // если заполнили все слоты — переходим к турниру
    if (Object.keys(nextPlaced).length === formation.slots.length) {
      startTournament(nextPlaced);
    }
  };

  const startTournament = (pl: Record<string, Placed>) => {
    const xi = formation.slots.map((s) => pl[s]?.player).filter(Boolean) as SquadPlayer[];
    const rng = makeRng(seed + ":tourney");
    const t = createTournament(rng, teamRating(xi, style));
    setTournament(t);
    setMatchDay(0);
    setMyGroup({ w: 0, d: 0, l: 0, gf: 0, ga: 0 });
    const init: Record<string, GroupRow> = {};
    t.group.forEach((g) => {
      init[g.name] = { name: g.name, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    });
    setAiGroup(init);
    setPhase("tournament");
  };

  const matchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishMatch = () => {
    if (matchTimer.current) { clearTimeout(matchTimer.current); matchTimer.current = null; }
    if (!tournament) return;
    const rng = makeRng(seed + ":m" + matchDay);
    const oppIdx = randomSquad(rng, usedSquads);
    const opp = SQUADS[oppIdx];
    const res = simulateMatch(myXi, opp.p, seed + ":" + matchDay + ":" + opp.c, style);
    setMatchLive(null);
    setMatchResult(res);
    applyResult(res, opp.c);
  };

  const startMatch = () => {
    if (!tournament) return;
    setMatchResult(null);
    setMatchLive(null);
    const rng = makeRng(seed + ":m" + matchDay);
    const oppIdx = randomSquad(rng, usedSquads);
    const opp = SQUADS[oppIdx];
    const res = simulateMatch(myXi, opp.p, seed + ":" + matchDay + ":" + opp.c, style);
    // live-анимация
    let minute = 0;
    const total = res.events.length;
    const step = Math.max(2, Math.round(90 / Math.max(1, total)));
    const tick = () => {
      minute += step;
      const visible = res.events.filter((e) => e.min <= minute);
      let gf = 0, ga = 0;
      visible.forEach((e) => {
        if (e.type === "goal") e.team === "me" ? gf++ : ga++;
      });
      setMatchLive({ ...res, events: visible, gf, ga });
      if (minute >= 90) {
        matchTimer.current = null;
        setMatchResult(res);
        applyResult(res, opp.c);
        return;
      }
      matchTimer.current = setTimeout(tick, 200);
    };
    tick();
  };

  const applyResult = (res: MatchResult, oppName: string) => {
    const g = { ...myGroup };
    if (res.won) g.w++;
    else if (res.drawn) g.d++;
    else g.l++;
    g.gf += res.gf;
    g.ga += res.ga;
    setMyGroup(g);
    // ИИ-матчи остальных пар (упрощённо: рейтинг против рейтинга)
    setAiGroup((prev) => {
      const next = { ...prev };
      const other = tournament!.group.filter((t) => t.name !== "Ваша команда");
      const i = other[matchDay % other.length];
      const j = other[(matchDay + 1) % other.length];
      const rng = makeRng(seed + ":ai" + matchDay);
      const ri = i.rating + (rng() - 0.5) * 6;
      const rj = j.rating + (rng() - 0.5) * 6;
      const gf = Math.max(0, Math.round(1.2 + (ri - rj) / 25 + (rng() - 0.5) * 1.5));
      const ga = Math.max(0, Math.round(1.2 + (rj - ri) / 25 + (rng() - 0.5) * 1.5));
      const rowI = { ...next[i.name] };
      const rowJ = { ...next[j.name] };
      rowI.gf += gf; rowI.ga += ga;
      rowJ.gf += ga; rowJ.ga += gf;
      if (gf > ga) { rowI.w++; rowJ.l++; }
      else if (gf < ga) { rowI.l++; rowJ.w++; }
      else { rowI.d++; rowJ.d++; }
      rowI.pts = rowI.w * 3 + rowI.d;
      rowJ.pts = rowJ.w * 3 + rowJ.d;
      next[i.name] = rowI;
      next[j.name] = rowJ;
      return next;
    });
    setMatchDay((d) => d + 1);
  };

  const playFinal = () => {
    if (finalRan.current) return;
    finalRan.current = true;
    setFinalPlayed(true);
    const rng = makeRng(seed + ":final");
    const opp = pickOpponent(rng, teamRating(myXi, style) + 3, usedSquads);
    const res = simulateMatch(myXi, opp.p, seed + ":final:" + opp.c, style);
    setFinalOpp(opp);
    setFinalResult(res);
    setChampion(res.won);
    finishGame(res.won);
  };

  const finishGame = (won: boolean) => {
    const cleanName = getDeviceName().trim() || "Игрок";
    const xp = won ? XP_KEYS.draft_champion : XP_KEYS.draft_qualify;
    setXpGained(xp);
    ensureProfile(deviceId, cleanName).then(() => addXp(deviceId, xp, cleanName));
    setPhase("finished");
    // Report to progression system
    void reportResult({
      gameId: "football-draft",
      won,
      score: won ? 150 : 50,
    });
  };

  // ---------- Рендер ----------
  return (
    <div className="text-white">
      <div className="flex items-center justify-between mb-2">
        <small className="text-[11px] tracking-[0.2em] text-emerald-300/70">КЛУБНЫЕ ЛЕГЕНДЫ · 2000—2026 · SEED {seed}</small>
        <ProfileBadge />
      </div>

      {phase === "scheme" && (
        <SchemePhase
          formation={formation}
          setFormation={setFormation}
          style={style}
          setStyle={setStyle}
          onDone={() => {
            rollSquad(false);
            setPhase("draft");
          }}
        />
      )}

      {phase === "draft" && (
        <DraftPhase
          squad={currentSquad}
          formation={formation}
          placed={placed}
          selected={selected}
          setSelected={setSelected}
          rerolls={rerolls}
          placedCount={placedCount}
          onRoll={() => rollSquad(true)}
          onAutoRoll={autoRoll}
          onPickSlot={pickSlot}
          onDone={() => {}}
        />
      )}

      {phase === "tournament" && tournament && (
        <TournamentPhase
          matchDay={matchDay}
          finalPlayed={finalPlayed}
          myGroup={myGroup}
          aiGroup={aiGroup}
          groupNames={tournament.group.map((g) => g.name)}
          matchLive={matchLive}
          matchResult={matchResult}
          myRating={teamRating(myXi, style)}
          formationName={formation.name}
          onMatch={startMatch}
          onFinal={() => playFinal()}
          onSkip={finishMatch}
          onNextMatch={startMatch}
        />
      )}

      {phase === "finished" && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 text-center">
          {champion ? (
            <p className="text-2xl font-black text-emerald-400">🏆 ЧЕМПИОН ТУРНИРА!</p>
          ) : (
            <p className="text-2xl font-black text-white/80">ТУРНИР ЗАВЕРШЁН</p>
          )}
          {finalResult && (
            <p className="mt-2 text-sm text-white/60">
              Финал: {finalResult.gf}:{finalResult.ga} против {finalOpp?.c}
            </p>
          )}
          {xpGained > 0 && (
            <p className="mt-3 text-sm font-semibold text-amber-400">+{xpGained} XP</p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-emerald-600 text-white font-bold px-6 py-3 hover:bg-emerald-500 transition active:scale-95"
          >
            НОВЫЙ ДРАФТ
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Фаза: схема ----------
function SchemePhase({
  formation,
  setFormation,
  style,
  setStyle,
  onDone,
}: {
  formation: Formation;
  setFormation: (f: Formation) => void;
  style: Style;
  setStyle: (s: Style) => void;
  onDone: () => void;
}) {
  const styleLabel = style === "def" ? "Оборона" : style === "atk" ? "Атака" : "Баланс";
  return (
    <div className="mt-8 grid lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 sm:p-6">
        <small className="text-[11px] tracking-[0.2em] text-emerald-300/70">01 · ВЫБЕРИ СХЕМУ</small>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {FORMATIONS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormation(f)}
              className={`rounded-xl border px-3 py-3 text-left transition active:scale-[0.97] ${
                formation.id === f.id
                  ? "border-emerald-500 bg-emerald-600/20 text-white ring-1 ring-emerald-500/30"
                  : "border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:bg-white/10"
              }`}
            >
              <b>{f.name}</b>
              <div className={`text-[11px] ${formation.id === f.id ? "text-emerald-300" : "text-white/40"}`}>
                {f.lines} линии
              </div>
            </button>
          ))}
        </div>
        <small className="mt-5 block text-[11px] tracking-[0.2em] text-emerald-300/70">СТИЛЬ</small>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["def", "bal", "atk"] as Style[]).map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`rounded-xl border px-3 py-3 text-sm font-semibold transition active:scale-[0.97] ${
                style === s
                  ? "border-amber-500 bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
                  : "border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:bg-white/10"
              }`}
            >
              {s === "def" ? "Оборона" : s === "atk" ? "Атака" : "Баланс"}
            </button>
          ))}
        </div>
        <button
          onClick={onDone}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-black px-6 py-4 hover:from-emerald-500 hover:to-emerald-600 transition active:scale-[0.98] shadow-lg shadow-emerald-900/30"
        >
          НАЧАТЬ ДРАФТ →
        </button>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 sm:p-6">
        <small className="text-[11px] tracking-[0.2em] text-emerald-300/70">ТЕКУЩАЯ РАССТАНОВКА</small>
        <Pitch
          formation={formation}
          players={formation.slots.map(() => null)}
          highlight={null}
          onSlot={() => {}}
          styleLabel={styleLabel}
        />
        <p className="mt-4 text-sm text-white/50">
          Дальше выпадут исторические клубные составы. Из каждого можно забрать одного игрока.
          11 игроков · {MAX_REROLLS} переброса · 7 матчей.
        </p>
      </div>
    </div>
  );
}

// ---------- Фаза: трансферный стол ----------
function DraftPhase({
  squad,
  formation,
  placed,
  selected,
  setSelected,
  rerolls,
  placedCount,
  onRoll,
  onAutoRoll,
  onPickSlot,
}: {
  squad: Squad;
  formation: Formation;
  placed: Record<string, Placed>;
  selected: number | null;
  setSelected: (i: number | null) => void;
  rerolls: number;
  placedCount: number;
  onRoll: () => void;
  onAutoRoll: () => void;
  onPickSlot: (slot: string) => void;
  onDone: () => void;
}) {
  const selectedPlayer = selected !== null ? squad.p[selected] : null;
  const styleLabel = "Баланс";
  // Проверка: есть ли в составе игрок, подходящий хотя бы в один пустой слот
  const emptySlots = formation.slots.filter((s) => !placed[s]);
  const hasUsablePlayer = emptySlots.length > 0 && squad.p.some((p) =>
    emptySlots.some((slot, idx) => {
      const slotIdx = formation.slots.indexOf(slot);
      return p.pos.some((pos) => formation.slotsPos[slotIdx].includes(pos));
    })
  );
  // Авто-переброс, если в составе нет подходящего (без расхода переборов)
  if (!hasUsablePlayer && placedCount < formation.slots.length) {
    onAutoRoll();
  }
  return (
    <div className="mt-8 grid lg:grid-cols-[1fr_1.2fr] gap-6">
      {/* Поле */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <small className="text-[11px] tracking-[0.2em] text-emerald-300/70">
            02 · ТРАНСФЕРНЫЙ СТОЛ
          </small>
          <span className="text-xs font-semibold text-white/50">
            ВЫБРАНО {placedCount}/{formation.slots.length}
          </span>
        </div>
        <Pitch
          formation={formation}
          players={formation.slots.map((s) => placed[s]?.player ?? null)}
          highlight={selectedPlayer ? formation.slots : null}
          onSlot={onPickSlot}
          styleLabel={styleLabel}
          eligiblePos={selectedPlayer?.pos}
        />
        {placedCount === formation.slots.length && (
          <div className="mt-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-3 text-sm font-semibold text-center animate-pulse">
            ✓ СТАРТОВЫЕ 11 ГОТОВЫ — турнир стартует автоматически
          </div>
        )}
      </div>
      {/* Выпавший состав */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 sm:p-6">
        <small className="text-[11px] tracking-[0.2em] text-emerald-300/70">ВЫПАЛ СОСТАВ</small>
        <h3 className="mt-2 text-xl font-black text-white">{squad.c}</h3>
        <p className="text-sm text-white/40">{squad.s}</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={onRoll}
            disabled={rerolls <= 0}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:border-white/30 hover:bg-white/10 disabled:opacity-30 transition active:scale-[0.97]"
          >
            🔄 ДРУГОЙ КЛУБ
          </button>
          <span className="text-xs text-white/40 self-center">Осталось: {rerolls}</span>
        </div>
        <p className="mt-3 text-xs text-white/40">
          Выбери футболиста, затем нажми на подсвеченное место на схеме.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-1.5 max-h-[420px] overflow-y-auto pr-1">
          {squad.p.map((p, i) => {
            const isSel = selected === i;
            return (
              <button
                key={i}
                onClick={() => setSelected(isSel ? null : i)}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition active:scale-[0.98] ${
                  isSel
                    ? "border-emerald-500 bg-emerald-600/20 text-white ring-1 ring-emerald-500/30"
                    : "border-white/8 bg-white/4 text-white/70 hover:border-white/20 hover:bg-white/8"
                }`}
              >
                <span className={`w-8 text-center text-sm font-black tabular-nums ${isSel ? "text-emerald-400" : "text-amber-400"}`}>{p.r}</span>
                <span className="flex-1">
                  <b className="block text-sm leading-tight">{p.n}</b>
                  <small className={isSel ? "text-emerald-300" : "text-white/40"}>
                    {p.nat} · {p.pos.map((x) => POS_RU[x]).join(" / ")}
                  </small>
                </span>
                <span className={`text-lg font-light ${isSel ? "text-emerald-400" : "text-white/30"}`}>{isSel ? "✓" : "+"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- Поле (схема) ----------
function Pitch({
  formation,
  players,
  highlight,
  onSlot,
  styleLabel,
  eligiblePos,
}: {
  formation: Formation;
  players: Array<SquadPlayer | null>;
  highlight: string[] | null;
  onSlot: (slot: string) => void;
  styleLabel: string;
  eligiblePos?: string[];
}) {
  // Базовые координаты по типу слота (top%: 92 — свои ворота, 18 — атака)
  const baseLayout: Record<string, { x: number; y: number }> = {
    GK: { x: 50, y: 92 },
    FB_L: { x: 18, y: 74 },
    FB_R: { x: 82, y: 74 },
    CB: { x: 50, y: 70 },
    DM: { x: 38, y: 56 },
    CM: { x: 50, y: 52 },
    AM: { x: 50, y: 38 },
    W_L: { x: 18, y: 32 },
    W_R: { x: 82, y: 32 },
    ST: { x: 50, y: 18 },
  };
  // Координаты: базовая + горизонтальный сдвиг для слотов одного типа (CB1/CB2/CB3 и т.д.)
  const positions = formation.slots.map((slot, i) => {
    const type = slot.replace(/\d+$/, "");
    const base = baseLayout[type] ?? { x: 50, y: 50 };
    const sameType = formation.slots.filter((s) => s.replace(/\d+$/, "") === type);
    const idx = sameType.indexOf(slot);
    const n = sameType.length;
    const spread = idx === 0 && n === 1 ? 0 : (idx - (n - 1) / 2) * 16;
    const x = Math.min(90, Math.max(10, base.x + spread));
    return { x, y: base.y, slot, player: players[i] };
  });

  return (
    <div className="relative mt-4 aspect-[3/4] w-full rounded-2xl overflow-hidden bg-gradient-to-b from-emerald-800/90 to-emerald-900/90 border border-emerald-950/30">
      {/* линии поля */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
      <div className="absolute left-1/2 top-1/2 w-16 h-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
      <div className="absolute left-1/2 bottom-0 w-40 h-20 -translate-x-1/2 border border-b-0 border-white/20" />
      <div className="absolute left-1/2 top-0 w-40 h-20 -translate-x-1/2 border border-t-0 border-white/20" />
      {positions.map(({ x, y, slot, player }, i) => {
        const label = formation.labels[i];
        const eligible = eligiblePos && highlight?.includes(slot) && eligiblePos.some((p) =>
          formation.slotsPos[i].includes(p)
        );
        const clickable = !!player || (highlight?.includes(slot) && !!eligible);
        return (
          <button
            key={slot}
            onClick={() => clickable && onSlot(slot)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition ${
              eligible ? "z-10 scale-110" : ""
            } ${player ? "cursor-pointer" : "cursor-default"}`}
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <span
              className={`w-11 h-11 rounded-full flex items-center justify-center text-[11px] font-black shadow-lg ${
                player
                  ? "bg-white text-stone-900"
                  : eligible
                  ? "bg-amber-400 text-stone-900 animate-pulse"
                  : "bg-white/15 text-white/70 border border-dashed border-white/40"
              }`}
            >
              {player ? player.r : label}
            </span>
            <span className="mt-1 max-w-[70px] truncate text-[10px] font-semibold text-white drop-shadow">
              {player ? player.n : label}
            </span>
            {player && <span className="text-[9px] text-white/70">{label}</span>}
          </button>
        );
      })}
      <div className="absolute top-2 left-2 text-[10px] font-semibold text-white/60">
        {formation.name} · {styleLabel}
      </div>
    </div>
  );
}

// ---------- Фаза: турнир ----------
function TournamentPhase({
  matchDay,
  finalPlayed,
  myGroup,
  aiGroup,
  groupNames,
  matchLive,
  matchResult,
  myRating,
  formationName,
  onMatch,
  onFinal,
  onSkip,
  onNextMatch,
}: {
  matchDay: number;
  finalPlayed: boolean;
  myGroup: { w: number; d: number; l: number; gf: number; ga: number };
  aiGroup: Record<string, GroupRow>;
  groupNames: string[];
  matchLive: MatchResult | null;
  matchResult: MatchResult | null;
  myRating: number;
  formationName: string;
  onMatch: () => void;
  onFinal: () => void;
  onSkip: () => void;
  onNextMatch: () => void;
}) {
  const inGroup = matchDay < 6;
  const myPts = myGroup.w * 3 + myGroup.d;
  const table = [
    { name: "Ваша команда", w: myGroup.w, d: myGroup.d, l: myGroup.l, gf: myGroup.gf, ga: myGroup.ga, pts: myPts },
    ...groupNames.slice(1).map((n) => aiGroup[n]),
  ].sort((a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga));
  const myPlace = table.findIndex((t) => t.name === "Ваша команда") + 1;
  const groupDone = matchDay >= 6;

  return (
    <div className="mt-8 grid lg:grid-cols-[1.2fr_1fr] gap-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <small className="text-[11px] tracking-[0.2em] text-emerald-300/70">
            03 · ИСТОРИЧЕСКИЙ ТУРНИР
          </small>
          <span className="text-xs font-semibold text-white/50">
            {inGroup ? `ГРУППА · ТУР ${matchDay + 1} / 6` : "ФИНАЛ"}
          </span>
        </div>

        {!matchLive && !matchResult && (
          <button
            onClick={inGroup ? onMatch : onFinal}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-black px-6 py-4 hover:from-emerald-500 hover:to-emerald-600 transition active:scale-[0.98] shadow-lg shadow-emerald-900/30"
          >
            {inGroup ? "НАЧАТЬ МАТЧ ▶" : "ИГРАТЬ ФИНАЛ ▶"}
          </button>
        )}

        {matchLive && (
          <div className="mt-4">
            <div className="flex items-center justify-between rounded-xl bg-black/40 border border-white/10 text-white px-4 py-3">
              <div className="text-center flex-1">
                <b>Ваша команда</b>
                <div className="text-[11px] text-emerald-400">Рейтинг {myRating}</div>
              </div>
              <div className="text-3xl font-black tabular-nums px-3 text-amber-400">
                {matchLive.gf}:{matchLive.ga}
              </div>
              <div className="text-center flex-1">
                <b>Соперник</b>
                <div className="text-[11px] text-red-400">● LIVE {matchLive.events.length} событий</div>
              </div>
            </div>
            <ul className="mt-3 space-y-1 max-h-56 overflow-y-auto text-sm">
              {[...matchLive.events].reverse().map((e, i) => (
                <li key={i} className="flex gap-2 text-white/60">
                  <span className="w-8 text-right tabular-nums text-white/30">{e.min}'</span>
                  <span className={e.type === "goal" ? "font-bold text-emerald-400" : ""}>{e.text}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={onSkip}
              className="mt-3 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/50 hover:bg-white/10 transition"
            >
              ⏩ ЗАВЕРШИТЬ МАТЧ
            </button>
          </div>
        )}

        {matchResult && !matchLive && (
          <div>
            <MatchReport result={matchResult} myRating={myRating} formationName={formationName} />
            {!groupDone && (
              <button
                onClick={onNextMatch}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-black px-6 py-4 hover:from-emerald-500 hover:to-emerald-600 transition active:scale-[0.98]"
              >
                СЛЕДУЮЩИЙ МАТЧ ▶
              </button>
            )}
          </div>
        )}

        {groupDone && !finalPlayed && (
          <button
            onClick={onFinal}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black px-6 py-4 hover:from-amber-400 hover:to-orange-500 transition active:scale-[0.98] shadow-lg shadow-amber-900/30"
          >
            {myPlace === 1 ? "🏆 ФИНАЛ ТУРНИРА ▶" : "ФИНАЛ (место в группе: " + myPlace + ") ▶"}
          </button>
        )}
      </div>

      {/* Таблица группы */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 sm:p-6">
        <small className="text-[11px] tracking-[0.2em] text-emerald-300/70">ТАБЛИЦА ГРУППЫ</small>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-[11px] text-white/30 tracking-wider">
              <th className="text-left font-semibold">КОМАНДА</th>
              <th className="text-center">И</th>
              <th className="text-center">В</th>
              <th className="text-center">Н</th>
              <th className="text-center">П</th>
              <th className="text-center">О</th>
            </tr>
          </thead>
          <tbody>
            {table.map((t, i) => (
              <tr key={t.name} className={`text-white/70 ${t.name === "Ваша команда" ? "bg-emerald-600/20 text-emerald-300 font-bold" : ""}`}>
                <td className="py-1.5 font-semibold">{i + 1}. {t.name}</td>
                <td className="text-center tabular-nums">{t.w + t.d + t.l}</td>
                <td className="text-center tabular-nums">{t.w}</td>
                <td className="text-center tabular-nums">{t.d}</td>
                <td className="text-center tabular-nums">{t.l}</td>
                <td className="text-center font-black tabular-nums">{t.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {groupDone && (
          <p className="mt-3 text-xs text-white/40">
            Место в группе: <b className="text-amber-400">{myPlace}</b>. {myPlace === 1 ? "Вышли в финал!" : "Финал доступен, но шансов мало."}
          </p>
        )}
      </div>
    </div>
  );
}

function MatchReport({
  result,
  myRating,
  formationName,
}: {
  result: MatchResult;
  myRating: number;
  formationName: string;
}) {
  return (
    <div className="mt-4">
      <div className="rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-white">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-emerald-300">Ваша команда · {formationName}</span>
          <span className="text-2xl font-black tabular-nums text-amber-400">{result.gf}:{result.ga}</span>
          <span className="font-semibold text-white/60">Соперник</span>
        </div>
        <div className="mt-1 flex justify-center gap-4 text-[11px] text-white/40">
          <span>Владение {result.poss}%</span>
          <span>xG {result.xg[0]} : {result.xg[1]}</span>
          <span>Удары {result.shots[0]} : {result.shots[1]}</span>
        </div>
        {result.manOfMatch && (
          <div className="mt-2 text-center text-xs text-white/50">
            ⭐ Игрок матча: <b className="text-amber-300">{result.manOfMatch.name}</b> ({result.manOfMatch.rating})
          </div>
        )}
      </div>
      {Object.keys(result.playerRatings).length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-1">
          {Object.entries(result.playerRatings).map(([n, r]) => (
            <div key={n} className="flex justify-between text-xs text-white/50">
              <span className="truncate pr-2">{n}</span>
              <b className={`tabular-nums ${r >= 7.5 ? "text-emerald-400" : r >= 6.5 ? "text-amber-400" : "text-white/40"}`}>{r.toFixed(1)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
