"use client";

// ============================================================
// LEADERBOARD PAGE — unified XP-based leaderboard
// ============================================================

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/auth";
import { levelFromXp, rankOf } from "@/lib/xp";

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_xp: number;
  created_at: string;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="min-h-screen bg-stone-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-6 text-center">
            <h1 className="text-2xl font-black">🏆 ЛИДЕРБОРД</h1>
            <p className="mt-1 text-emerald-200 text-sm">
              Топ по общему XP
            </p>
          </div>

          {entries.length === 0 ? (
            <div className="p-8 text-center text-stone-500">
              Пока нет игроков. Станьте первым!
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {entries.map((entry, idx) => {
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
