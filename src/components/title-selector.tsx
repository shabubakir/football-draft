"use client";

// ============================================================
// TITLE SELECTOR — выбор титула для профиля
// ============================================================

import { useEffect, useState } from "react";

interface TitleDef {
  id: string;
  name: string;
  icon: string;
  requirement: string;
  minLevel: number;
  unlocked: boolean;
  isActive: boolean;
  isSelectable: boolean;
}

export function TitleSelector() {
  const [titles, setTitles] = useState<TitleDef[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    loadTitles();
  }, []);

  const loadTitles = async () => {
    try {
      const res = await fetch("/api/progression/titles");
      const data = await res.json();
      if (data.ok) {
        setTitles(data.titles);
        setSelectedTitle(data.selectedTitle);
        setLevel(data.level);
      }
    } catch (e) {
      console.error("Failed to load titles:", e);
    } finally {
      setLoading(false);
    }
  };

  const selectTitle = async (titleId: string) => {
    setSelecting(titleId);
    try {
      const res = await fetch("/api/progression/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleId }),
      });
      const data = await res.json();
      if (data.ok) {
        setSelectedTitle(titleId);
        setTitles((prev) =>
          prev.map((t) => ({ ...t, isActive: t.id === titleId }))
        );
      }
    } catch (e) {
      console.error("Failed to select title:", e);
    } finally {
      setSelecting(null);
    }
  };

  if (loading) {
    return (
      <div className="h-32 animate-pulse rounded-2xl bg-stone-100" />
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-stone-700">🎖️ ТИТУЛЫ</h3>
      <p className="text-xs text-stone-500">
        Выберите титул для отображения в профиле (ур. {level})
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {titles.map((t) => {
          const isSelected = selectedTitle === t.id;
          const isLocked = !t.unlocked;
          return (
            <button
              key={t.id}
              onClick={() => !isLocked && selectTitle(t.id)}
              disabled={isLocked || selecting === t.id}
              className={`rounded-xl border-2 p-3 text-center transition ${
                isSelected
                  ? "border-amber-400 bg-amber-50"
                  : isLocked
                  ? "border-stone-200 bg-stone-50 opacity-50 cursor-not-allowed"
                  : "border-stone-200 bg-white hover:border-amber-300 hover:bg-amber-50"
              }`}
              title={isLocked ? `Нужен уровень ${t.minLevel}` : t.requirement}
            >
              <div className="text-2xl">{isLocked ? "🔒" : t.icon}</div>
              <div className={`text-xs font-bold mt-1 ${isSelected ? "text-amber-700" : "text-stone-700"}`}>
                {t.name}
              </div>
              <div className="text-[10px] text-stone-400">ур. {t.minLevel}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
