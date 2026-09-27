"use client";

// ============================================================
// FOOTBALL AKINATOR — основной компонент игры
// ============================================================
// Персонаж: волшебный джинн из футбольного мяча.
// Дизайн: тёплый кремовый фон сайта, но внутри — своя
// «магическая» атмосфера (фиолетовые акценты, искры).
// ============================================================

import { useState, useCallback, useEffect } from "react";
import {
  newGame,
  answer as engineAnswer,
  acceptGuess,
  rejectGuess,
  revealAnswer,
  currentQuestion,
  topCandidate,
  type EngineState,
} from "./engine";
import { ENTITY_MAP, CATEGORIES } from "./data";
import type { Answer, Entity } from "./types";
import { Genie } from "./genn";
import type { GenieMood } from "./genn";
import { loadStats, recordGame, resetStats, EMPTY_STATS } from "./stats";
import { getEntityPhoto } from "./avatars";
import type { AkinatorStats } from "./types";

// ---------- вспомогательные ----------

function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

function categoryColor(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.color ?? "#888";
}

/** Заглушка-эмодзи по категории (если нет img) */
function categoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    player: "⚽", coach: "📋", club: "🏟️", national_team: "🚩",
    stadium: "🏟️", tournament: "🏆", league: "📊", referee: "🟡",
    position: "👟", term: "📖", award: "🥇", event: "✨",
  };
  return map[cat] ?? "⚽";
}

// ---------- основной компонент ----------

export function AkinatorGame() {
  const [state, setState] = useState<EngineState | null>(null);
  const [stats, setStats] = useState<AkinatorStats>(EMPTY_STATS);
  const [transitioning, setTransitioning] = useState(false);
  const [showCorrectInput, setShowCorrectInput] = useState(false);
  const [correctQuery, setCorrectQuery] = useState("");
  const [lastWrongGuess, setLastWrongGuess] = useState<Entity | null>(null);
  const [started, setStarted] = useState(false);

  // Инициализация
  useEffect(() => {
    setState(newGame());
    setStats(loadStats());
  }, []);

  // ---------- действия ----------

  const handleStart = useCallback(() => {
    setStarted(true);
  }, []);

  const handleAnswer = useCallback(
    (ans: Answer) => {
      if (!state || state.phase !== "playing" || transitioning) return;
      const q = currentQuestion(state);
      if (!q) return;
      setTransitioning(true);
      setTimeout(() => {
        setState(engineAnswer(state, q.id, ans));
        setTransitioning(false);
      }, 350);
    },
    [state, transitioning]
  );

  const handleAccept = useCallback(() => {
    if (!state) return;
    const next = acceptGuess(state);
    setState(next);
    recordGame(true, state.questionNum);
    setStats(loadStats());
  }, [state]);

  const handleReject = useCallback(() => {
    if (!state) return;
    if (state.guessId) {
      setLastWrongGuess(ENTITY_MAP.get(state.guessId) ?? null);
    }
    const next = rejectGuess(state);
    setState(next);
  }, [state]);

  const handleReveal = useCallback(
    (entityId: string) => {
      if (!state) return;
      setState(revealAnswer(state, entityId));
      recordGame(false, state.questionNum);
      setStats(loadStats());
      setShowCorrectInput(false);
      setCorrectQuery("");
    },
    [state]
  );

  const handleNewGame = useCallback(() => {
    setState(newGame());
    setStarted(true);
    setShowCorrectInput(false);
    setCorrectQuery("");
    setLastWrongGuess(null);
  }, []);

  const handleResetStats = useCallback(() => {
    resetStats();
    setStats(EMPTY_STATS);
  }, []);

  // ---------- поиск для «назови правильный ответ» ----------
  const searchResults =
    showCorrectInput && correctQuery.trim().length >= 2
      ? Array.from(ENTITY_MAP.values()).filter((e) => {
          const q = correctQuery.trim().toLowerCase();
          return (
            e.name.toLowerCase().includes(q) ||
            e.nameEn.toLowerCase().includes(q) ||
            e.keywords.some((k) => k.toLowerCase().includes(q))
          );
        }).slice(0, 6)
      : [];

  // ---------- текущий вопрос ----------
  const question = state ? currentQuestion(state) : null;
  const guessEntity =
    state?.guessId ? ENTITY_MAP.get(state.guessId) ?? null : null;
  const correctEntity = state?.correctId
    ? ENTITY_MAP.get(state.correctId) ?? null
    : null;

  // ---------- мoods джинна ----------
  let mood: GenieMood = "idle";
  if (state) {
    if (state.phase === "playing") mood = "thinking";
    else if (state.phase === "guessing") mood = "reveal";
    else if (state.phase === "won") mood = "happy";
    else if (state.phase === "lost" || state.phase === "surrender") mood = "sad";
  }

  // ---------- рендер ----------
  if (!state) return null;

  return (
    <div className="akinator-root">
      {/* ======= СТАРТОВЫЙ ЭКРАН ======= */}
      {!started && state.phase === "playing" && (
        <div className="ak-start">
          <Genie mood="idle" size={200} />
          <h2 className="ak-start-title">
            FOOTBALL <span className="ak-accent">AKINATOR</span>
          </h2>
          <p className="ak-start-desc">
            Загадай любого футболиста, клуб, стадион или объект из мира футбола.
            <br />
            <strong>Джинн из футбольного мяча</strong> попробует угадать его
            за несколько вопросов.
          </p>

          {/* Статистика */}
          <div className="ak-stats-row">
            <div className="ak-stat">
              <span className="ak-stat-num">{stats.games}</span>
              <span className="ak-stat-label">Игр</span>
            </div>
            <div className="ak-stat">
              <span className="ak-stat-num">{stats.wins}</span>
              <span className="ak-stat-label">Побед</span>
            </div>
            <div className="ak-stat">
              <span className="ak-stat-num">
                {stats.games > 0
                  ? Math.round(
                      (stats.wins / stats.games) * 100
                    )
                  : 0}
                %
              </span>
              <span className="ak-stat-label">Успех</span>
            </div>
            <div className="ak-stat">
              <span className="ak-stat-num">
                {stats.bestResult ?? "—"}
              </span>
              <span className="ak-stat-label">Рекорд</span>
            </div>
          </div>

          <button className="ak-btn ak-btn-primary" onClick={handleStart}>
            ЗАГАДАТЬ ИГРАТЬ →
          </button>
          {stats.games > 0 && (
            <button
              className="ak-btn-link"
              onClick={handleResetStats}
            >
              Сбросить статистику
            </button>
          )}
        </div>
      )}

      {/* ======= ИГРА ======= */}
      {started && state.phase === "playing" && question && (
        <div className="ak-game">
          {/* Шапка: вопрос № + кандидаты */}
          <div className="ak-hud">
            <div className="ak-hud-item">
              Вопрос <strong>{state.questionNum}</strong>
            </div>
            <div className="ak-hud-item">
              Осталось: <strong>{state.candidates.length}</strong>
            </div>
            {state.wrongGuesses > 0 && (
              <div className="ak-hud-item ak-hud-warn">
                Ошибок: {state.wrongGuesses}/{3}
              </div>
            )}
          </div>

          {/* Джинн */}
          <div className={`ak-genie-area ${transitioning ? "ak-transition" : ""}`}>
            <Genie mood={mood} size={160} />
          </div>

          {/* Вопрос (key по id вопроса — пересчёт при каждом новом вопросе) */}
          <div
            key={question.id}
            className="ak-question-card"
          >
            <p className="ak-question-text">{question.text}</p>
          </div>

          {/* Кнопки ответов */}
          <div className="ak-answers">
            <button
              className="ak-btn ak-ans ak-ans-yes"
              onClick={() => handleAnswer("yes")}
              disabled={transitioning}
            >
              Да
            </button>
            <button
              className="ak-btn ak-ans ak-ans-maybe-yes"
              onClick={() => handleAnswer("maybe_yes")}
              disabled={transitioning}
            >
              Скорее да
            </button>
            <button
              className="ak-btn ak-ans ak-ans-unknown"
              onClick={() => handleAnswer("unknown")}
              disabled={transitioning}
            >
              Не знаю
            </button>
            <button
              className="ak-btn ak-ans ak-ans-maybe-no"
              onClick={() => handleAnswer("maybe_no")}
              disabled={transitioning}
            >
              Скорее нет
            </button>
            <button
              className="ak-btn ak-ans ak-ans-no"
              onClick={() => handleAnswer("no")}
              disabled={transitioning}
            >
              Нет
            </button>
          </div>
        </div>
      )}

      {/* ======= ДОГАДКА ======= */}
      {state.phase === "guessing" && guessEntity && (
        <div className="ak-guess">
          <div className="ak-genie-area">
            <Genie mood="reveal" size={160} />
          </div>
          <p className="ak-guess-intro">
            Я думаю, ты загадал...
          </p>

          <div className="ak-guess-card">
            <EntityCard entity={guessEntity} />
          </div>

          <div className="ak-guess-btns">
            <button
              className="ak-btn ak-btn-win"
              onClick={handleAccept}
            >
              ✅ Да, угадал!
            </button>
            <button
              className="ak-btn ak-btn-lose"
              onClick={handleReject}
            >
              ❌ Нет, ошибся
            </button>
          </div>
        </div>
      )}

      {/* ======= ПОБЕДА ======= */}
      {state.phase === "won" && correctEntity && (
        <div className="ak-win">
          <div className="ak-win-burst">🎉</div>
          <div className="ak-genie-area">
            <Genie mood="happy" size={180} />
          </div>
          <h2 className="ak-win-title">Угадал!</h2>
          <p className="ak-win-sub">
            {correctEntity.name} — это было всего{" "}
            <strong>{state.questionNum}</strong> вопрос
            {state.questionNum % 10 === 1 && state.questionNum % 100 !== 11
              ? ""
              : state.questionNum % 10 >= 2 && state.questionNum % 10 <= 4 && (state.questionNum % 100 < 10 || state.questionNum % 100 >= 20)
                ? "а"
                : "ов"}
            .
          </p>
          <div className="ak-guess-card">
            <EntityCard entity={correctEntity} />
          </div>
          <div className="ak-stats-row ak-stats-mini">
            <div className="ak-stat">
              <span className="ak-stat-num">{stats.wins}</span>
              <span className="ak-stat-label">Побед</span>
            </div>
            <div className="ak-stat">
              <span className="ak-stat-num">
                {stats.bestResult ?? "—"}
              </span>
              <span className="ak-stat-label">Рекорд</span>
            </div>
          </div>
          <button className="ak-btn ak-btn-primary" onClick={handleNewGame}>
            ИГРАТЬ ЕЩЁ →
          </button>
        </div>
      )}

      {/* ======= ПОРАЖЕНИЕ / СДАЧА ======= */}
      {(state.phase === "lost" || state.phase === "surrender") && (
        <div className="ak-lose">
          <div className="ak-genie-area">
            <Genie mood="sad" size={180} />
          </div>
          <h2 className="ak-lose-title">
            {state.phase === "surrender"
              ? "Я пока не могу уверенно определить игрока."
              : "Мне не удалось..."}
          </h2>

          {lastWrongGuess && (
            <p className="ak-lose-last">
              Последний мой догад: <strong>{lastWrongGuess.name}</strong>
            </p>
          )}

          {state.phase === "lost" && correctEntity && (
            <div className="ak-guess-card">
              <p className="ak-lose-correct">Правильный ответ:</p>
              <EntityCard entity={correctEntity} />
            </div>
          )}

          {state.phase === "surrender" && (
            <>
              {!showCorrectInput ? (
                <button
                  className="ak-btn ak-btn-primary"
                  onClick={() => setShowCorrectInput(true)}
                >
                  Кто это был?
                </button>
              ) : (
                <div className="ak-correct-input">
                  <input
                    type="text"
                    placeholder="Введи имя или ключевое слово..."
                    value={correctQuery}
                    onChange={(e) => setCorrectQuery(e.target.value)}
                    autoFocus
                    className="ak-input"
                  />
                  {searchResults.length > 0 && (
                    <div className="ak-search-results">
                      {searchResults.map((e) => (
                        <button
                          key={e.id}
                          className="ak-search-item"
                          onClick={() => handleReveal(e.id)}
                        >
                          <span
                            className="ak-search-cat"
                            style={{
                              background: categoryColor(e.category),
                            }}
                          >
                            {categoryLabel(e.category)}
                          </span>
                          <span>{e.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <button className="ak-btn ak-btn-primary" onClick={handleNewGame}>
            ИГРАТЬ СНОВА →
          </button>
        </div>
      )}

      {/* Стили игры */}
      <style>{akinatorStyles}</style>
    </div>
  );
}

// ---------- карточка сущности ----------

function EntityCard({ entity }: { entity: Entity }) {
  const color = entity.color || categoryColor(entity.category);
  const photo = getEntityPhoto(entity);
  return (
    <div className="ak-entity" style={{ "--ak-color": color } as React.CSSProperties}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={entity.name}
          className="ak-entity-img"
        />
      ) : (
        <div className="ak-entity-emoji">{categoryEmoji(entity.category)}</div>
      )}
      <div className="ak-entity-info">
        <span
          className="ak-entity-cat"
          style={{ background: categoryColor(entity.category) }}
        >
          {categoryLabel(entity.category)}
        </span>
        <h3 className="ak-entity-name">{entity.name}</h3>
        {entity.nameEn !== entity.name && (
          <p className="ak-entity-name-en">{entity.nameEn}</p>
        )}
        <p className="ak-entity-blurb">{entity.blurb}</p>
      </div>
    </div>
  );
}

// ---------- стили ----------

const akinatorStyles = `
/* ============================================================
   FOOTBALL AKINATOR — стили (внутри игры, не трогает сайт)
   ============================================================ */

.akinator-root {
  font-family: var(--font-geist-sans, ui-sans-serif, system-ui, sans-serif);
  color: #faf5ff;
  max-width: 640px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

/* ======= СТАРТ ======= */
.ak-start {
  text-align: center;
  animation: akFadeIn 0.5s ease;
}
.ak-start-title {
  font-size: 1.8rem;
  font-weight: 800;
  margin: 1rem 0 0.5rem;
  letter-spacing: -0.02em;
  color: #faf5ff;
}
.ak-accent {
  background: linear-gradient(135deg, #a78bfa, #c4b5fd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.ak-start-desc {
  color: rgba(255,255,255,0.5);
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0.5rem 0 1.5rem;
}

/* ======= HUD ======= */
.ak-hud {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.ak-hud-item {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(167,139,250,0.2);
  border-radius: 999px;
  padding: 0.3rem 0.8rem;
  font-size: 0.85rem;
  color: rgba(255,255,255,0.5);
}
.ak-hud-item strong { color: #c4b5fd; }
.ak-hud-warn { color: #f87171; border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.1); }

/* ======= ГЕНИ ======= */
.ak-genie-area {
  display: flex;
  justify-content: center;
  margin: 0.5rem 0;
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.ak-transition {
  opacity: 0.4;
  transform: scale(0.95);
}

/* ======= ВОПРОС ======= */
.ak-game { animation: akFadeIn 0.4s ease; }
.ak-question-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(167,139,250,0.2);
  border-radius: 16px;
  padding: 1.25rem;
  margin: 0.75rem 0 1rem;
  text-align: center;
  animation: akQuestionIn 0.35s ease;
  backdrop-filter: blur(8px);
}
.ak-question-text {
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.45;
  color: #faf5ff;
  margin: 0;
}

/* ======= ОТВЕТЫ ======= */
.ak-answers {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
}
@media (max-width: 480px) {
  .ak-answers { grid-template-columns: repeat(2, 1fr); }
  .ak-answers .ak-ans-unknown { grid-column: span 2; }
}
.ak-btn {
  border: none;
  border-radius: 12px;
  padding: 0.7rem 1rem;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}
.ak-btn:active { transform: scale(0.97); }
.ak-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.ak-ans {
  background: rgba(255,255,255,0.04);
  border: 2px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
  font-size: 0.85rem;
  padding: 0.65rem 0.5rem;
}
.ak-ans:hover { border-color: #a78bfa; background: rgba(167,139,250,0.1); }
.ak-ans-yes { border-color: rgba(74,222,128,0.4); background: rgba(74,222,128,0.08); color: #4ade80; }
.ak-ans-yes:hover { background: rgba(74,222,128,0.15); }
.ak-ans-maybe-yes { border-color: rgba(163,230,53,0.3); background: rgba(163,230,53,0.06); color: #a3e635; }
.ak-ans-maybe-yes:hover { background: rgba(163,230,53,0.12); }
.ak-ans-unknown { border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.4); }
.ak-ans-maybe-no { border-color: rgba(251,146,60,0.3); background: rgba(251,146,60,0.06); color: #fb923c; }
.ak-ans-maybe-no:hover { background: rgba(251,146,60,0.12); }
.ak-ans-no { border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.06); color: #f87171; }
.ak-ans-no:hover { background: rgba(248,113,113,0.12); }

/* ======= КНОПКИ ======= */
.ak-btn-primary {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: #fff;
  font-size: 1.1rem;
  padding: 0.9rem 2rem;
  margin-top: 1rem;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3);
}
.ak-btn-primary:hover { box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4); transform: translateY(-1px); }
.ak-btn-win {
  background: #16a34a;
  color: #fff;
  flex: 1;
  font-size: 1rem;
  padding: 0.85rem 1.2rem;
}
.ak-btn-win:hover { background: #15803d; }
.ak-btn-lose {
  background: #dc2626;
  color: #fff;
  flex: 1;
  font-size: 1rem;
  padding: 0.85rem 1.2rem;
}
.ak-btn-lose:hover { background: #b91c1c; }
.ak-btn-link {
  background: none;
  border: none;
  color: #78716c;
  font-size: 0.8rem;
  cursor: pointer;
  margin-top: 1rem;
  text-decoration: underline;
  font-family: inherit;
}

/* ======= ДОГАДКА ======= */
.ak-guess {
  text-align: center;
  animation: akFadeIn 0.4s ease;
}
.ak-guess-intro {
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(255,255,255,0.6);
  margin: 0.5rem 0;
}
.ak-guess-btns {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

/* ======= КАРТОЧКА СУЩНОСТИ ======= */
.ak-entity {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(167,139,250,0.2);
  border-left: 4px solid var(--ak-color, #a78bfa);
  border-radius: 16px;
  padding: 1rem 1.25rem;
  text-align: left;
  max-width: 420px;
  margin: 0 auto;
  animation: akCardIn 0.4s ease;
  backdrop-filter: blur(8px);
}
.ak-entity-img {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  object-fit: cover;
  flex-shrink: 0;
}
.ak-entity-emoji {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(124,58,237,0.2), rgba(167,139,250,0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  flex-shrink: 0;
}
.ak-entity-info { min-width: 0; }
.ak-entity-cat {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  margin-bottom: 0.3rem;
}
.ak-entity-name {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0;
  color: #faf5ff;
  line-height: 1.2;
}
.ak-entity-name-en {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.35);
  margin: 0.15rem 0 0;
}
.ak-entity-blurb {
  font-size: 0.82rem;
  color: rgba(255,255,255,0.45);
  margin: 0.4rem 0 0;
  line-height: 1.4;
}

/* ======= ПОБЕДА ======= */
.ak-win {
  text-align: center;
  animation: akWinIn 0.6s ease;
}
.ak-win-burst {
  font-size: 3rem;
  animation: akBounce 0.8s ease;
}
.ak-win-title {
  font-size: 2.2rem;
  font-weight: 900;
  margin: 0.5rem 0 0.25rem;
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.ak-win-sub {
  color: rgba(255,255,255,0.5);
  margin: 0.5rem 0 1rem;
}

/* ======= ПОРАЖЕНИЕ ======= */
.ak-lose {
  text-align: center;
  animation: akFadeIn 0.4s ease;
}
.ak-lose-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: rgba(255,255,255,0.6);
  margin: 0.5rem 0 0.25rem;
}
.ak-lose-last {
  color: rgba(255,255,255,0.4);
  font-size: 0.9rem;
  margin: 0.25rem 0 1rem;
}
.ak-lose-correct {
  font-size: 0.85rem;
  color: rgba(255,255,255,0.35);
  margin: 0 0 0.5rem;
}

/* ======= ВВОД ПРАВИЛЬНОГО ОТВЕТА ======= */
.ak-correct-input {
  margin: 1rem auto;
  max-width: 340px;
  text-align: left;
}
.ak-input {
  width: 100%;
  padding: 0.7rem 1rem;
  border: 2px solid rgba(167,139,250,0.2);
  border-radius: 12px;
  font-size: 1rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
  background: rgba(255,255,255,0.05);
  color: #faf5ff;
}
.ak-input::placeholder { color: rgba(255,255,255,0.25); }
.ak-input:focus { border-color: #a78bfa; }
.ak-search-results {
  margin-top: 0.5rem;
  border: 1px solid rgba(167,139,250,0.2);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255,255,255,0.04);
}
.ak-search-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: none;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.9rem;
  color: rgba(255,255,255,0.7);
  text-align: left;
  transition: background 0.15s;
}
.ak-search-item:last-child { border-bottom: none; }
.ak-search-item:hover { background: rgba(167,139,250,0.1); }
.ak-search-cat {
  font-size: 0.65rem;
  font-weight: 700;
  color: #fff;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ======= СТАТИСТИКА ======= */
.ak-stats-row {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  margin: 1rem 0;
}
.ak-stats-mini { margin: 0.75rem 0; gap: 1rem; }
.ak-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ak-stat-num {
  font-size: 1.5rem;
  font-weight: 900;
  color: #c4b5fd;
}
.ak-stat-label {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.35);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ======= АНИМАЦИИ ======= */
@keyframes akFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes akQuestionIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes akCardIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes akWinIn {
  0% { opacity: 0; transform: scale(0.8); }
  50% { transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes akBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
`;
