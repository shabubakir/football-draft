"use client";

// ============================================================
// LEADERBOARD PAGE — unified XP-based leaderboard with categories
// ============================================================

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/auth";
import { levelFromXp, rankOf } from "@/lib/xp";
import { Nav } from "@/components/nav";
import { ReportBugButton } from "@/components/report-bug";
import { ProfileBadge } from "@/components/profile-badge";

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

  const filtered = entries;

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-stone-950 text-stone-100 flex items-center justify-center">
        <div className="text-stone-500 animate-pulse">Загрузка лидерборда...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full bg-stone-950 text-stone-100">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Nav dark />

        {/* Header */}
        <section className="mt-10 sm:mt-16">
          <small className="text-xs tracking-[0.2em] text-stone-400">
            FOOTBALL DRAFT · РЕЙТИНГ
          </small>
          <h1 className="mt-3 text-4xl sm:text-5xl font-black leading-tight text-white">
            ЛИДЕРБОРД
          </h1>
          <p className="mt-4 max-w-md text-stone-400">
            Топ-50 игроков по общему XP. Занимай своё место — играй каждый день.
          </p>
        </section>

        {/* Category tabs */}
        <div className="mt-8 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                category === c.id
                  ? "bg-emerald-500 text-stone-950"
                  : "bg-white/5 text-stone-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {category !== "all" && (
          <p className="mt-3 text-xs text-stone-500">
            {category === "football" && "⚽ Футбольные игры: Draft, Grid Day, Guess, Career, Quiz, Akinator"}
            {category === "cs2" && "🔫 CS2 игры: Cases, Aim, Higher/Lower"}
            {category === "geoguessr" && "🌍 GeoGuessr — угадай место по фото"}
            {" · Сортировка: общий XP"}
          </p>
        )}

        {/* Leaderboard list */}
        <div className="mt-6">
          {entries.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-stone-500">
              Пока нет игроков. Станьте первым!
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((entry, idx) => {
                const level = levelFromXp(entry.total_xp);
                const rank = rankOf(level);
                const medal =
                  idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;

                return (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-4 rounded-2xl border p-4 transition ${
                      idx < 3
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <span className="w-10 text-center">
                      {medal ? (
                        <span className="text-2xl">{medal}</span>
                      ) : (
                        <span className="text-sm font-black text-stone-500">
                          {idx + 1}
                        </span>
                      )}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-stone-700 flex items-center justify-center text-lg overflow-hidden">
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
                      <div className="font-bold text-white truncate">
                        {entry.username}
                      </div>
                      <div className="text-xs text-stone-400">
                        Уровень {level} · {rank.title}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-400">
                        {entry.total_xp}
                      </div>
                      <div className="text-xs text-stone-500">XP</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <ProfileBadge />
          <span className="text-xs tracking-[0.2em] text-stone-600">
            FOOTBALL DRAFT
          </span>
        </div>

        <footer className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600">
          <p>
            Football Draft · сделано для игры с друзьями ·{" "}
            <ReportBugButton />
          </p>
          <nav className="flex gap-4">
            <a href="/legal" className="hover:text-stone-400">
              Правила
            </a>
          </nav>
        </footer>
      </div>
    </main>
  );
}
