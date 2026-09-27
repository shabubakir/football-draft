"use client";

// ============================================================
// LEADERBOARD PAGE — unified XP-based leaderboard with categories
// ============================================================

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/auth";
import { levelFromXp, rankOf } from "@/lib/xp";
import { Nav } from "@/components/nav";

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_xp: number;
  created_at: string;
}

type Category = "all" | "football" | "cs2" | "geoguessr";

const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: "all", label: "Все", icon: "🌐" },
  { id: "football", label: "Футбол", icon: "⚽" },
  { id: "cs2", label: "CS2", icon: "🔫" },
  { id: "geoguessr", label: "География", icon: "🌍" },
];

// Game IDs per category (from registry)
const CATEGORY_GAMES: Record<Category, string[]> = {
  all: [],
  football: ["football-draft", "grid-day", "guess-player", "career", "quiz", "akinator"],
  cs2: ["cs2-cases", "cs2-aim", "cs2-hl"],
  geoguessr: ["geoguessr"],
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>("all");

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("leaderboard_view")
      .select()
      .order("total_xp", { ascending: false })
      .limit(50);

    if (data) {
      setEntries(data as LeaderboardEntry[]);
    }
    setLoading(false);
  };

  // Filter entries by category: for specific categories, sort by games played in that category
  // (we don't have per-category XP in leaderboard_view, so we show top players overall
  // but annotate their top category game)
  const filtered = entries;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-stone-500 animate-pulse">
          Загрузка лидерборда...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <Nav />
      </div>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-6 text-center">
            <h1 className="text-2xl font-black">🏆 ЛИДЕРБОРД</h1>
            <p className="mt-1 text-emerald-200 text-sm">
              Топ-50 по общему XP
            </p>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 p-3 bg-stone-100 border-b border-stone-200 overflow-x-auto">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold transition whitespace-nowrap ${
                  category === c.id
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          {/* Category description */}
          {category !== "all" && (
            <div className="px-4 py-2 bg-amber-50 text-amber-800 text-xs border-b border-amber-100">
              {category === "football" && "⚽ Футбольные игры: Draft, Grid Day, Guess, Career, Quiz, Akinator"}
              {category === "cs2" && "🔫 CS2 игры: Cases, Aim, Higher/Lower"}
              {category === "geoguessr" && "🌍 GeoGuessr — угадай место по фото"}
              <br />
              <span className="text-amber-600">Сортировка: общий XP (категория в разработке)</span>
            </div>
          )}

          {entries.length === 0 ? (
            <div className="p-8 text-center text-stone-500">
              Пока нет игроков. Станьте первым!
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filtered.map((entry, idx) => {
                const level = levelFromXp(entry.total_xp);
                const rank = rankOf(level);
                const medal =
                  idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;

                return (
                  <div
                    key={entry.user_id}
                    className="flex items-center gap-4 p-4 hover:bg-stone-50 transition"
                  >
                    <span className="w-10 text-center text-lg font-black">
                      {medal}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-lg">
                      {entry.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entry.avatar_url}
                          alt={entry.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        "👤"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-stone-900 truncate">
                        {entry.username}
                      </div>
                      <div className="text-xs text-stone-500">
                        Уровень {level} · {rank.title}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-600">
                        {entry.total_xp}
                      </div>
                      <div className="text-xs text-stone-400">XP</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

