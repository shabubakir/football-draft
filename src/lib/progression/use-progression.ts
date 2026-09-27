"use client";

// ============================================================
// USE PROGRESSION — client hook for games to report results
// ============================================================
// Call useProgression() in a game component, then:
//   const { reportResult } = useProgression();
//   await reportResult({ gameId: "cs2-aim", won: true, score: 842 });
//
// For guests: no-op (local stats handled by the game itself).
// For authenticated users: POSTs to /api/progression/report.
// ============================================================

import { useCallback, useState } from "react";
import { getSupabaseBrowser } from "../supabase";
import { showToast } from "@/components/toast-container";
import type { ProgressionResult } from "./types";

export interface ReportResultInput {
  gameId: string;
  won: boolean;
  score?: number;
  metadata?: Record<string, number>;
  isDaily?: boolean;
}

export function useProgression() {
  const [reporting, setReporting] = useState(false);
  const [lastResult, setLastResult] = useState<ProgressionResult | null>(null);

  const reportResult = useCallback(
    async (input: ReportResultInput): Promise<ProgressionResult> => {
      const supabase = getSupabaseBrowser();
      if (!supabase) return emptyResult();

      // Check if user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Guest: no server-side progression
        return emptyResult();
      }

      setReporting(true);
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;

        const res = await fetch("/api/progression/report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            gameId: input.gameId,
            won: input.won,
            score: input.score,
            metadata: input.metadata,
            isDaily: input.isDaily,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("Progression report failed:", err);
          return emptyResult();
        }

        const data = await res.json();
        const result: ProgressionResult = {
          xpAwarded: data.xpAwarded ?? 0,
          totalXp: data.totalXp ?? 0,
          level: data.level ?? 1,
          leveledUp: data.leveledUp ?? false,
          newAchievements: data.newAchievements ?? [],
          streakDays: data.streakDays ?? 0,
          streakMilestone: data.streakMilestone ?? false,
          missionsCompleted: data.missionsCompleted ?? [],
        };

        // Show toasts for important events
        if (result.leveledUp) {
          showToast({
            type: "levelup",
            title: `Уровень ${result.level}!`,
            message: `Вы достигли уровня ${result.level}`,
            icon: "⬆️",
          });
        }

        if (result.newAchievements.length > 0) {
          const ach = result.newAchievements[0];
          showToast({
            type: "achievement",
            title: "Достижение!",
            message: ach.name ?? "Новое достижение",
            icon: "🏆",
          });
        }

        if (result.streakMilestone && result.streakDays > 0) {
          showToast({
            type: "streak",
            title: `Серия: ${result.streakDays} дн.!`,
            message: "Отличная серия игр!",
            icon: "🔥",
          });
        }

        setLastResult(result);
        return result;
      } catch (e) {
        console.error("Progression report error:", e);
        return emptyResult();
      } finally {
        setReporting(false);
      }
    },
    []
  );

  return { reportResult, reporting, lastResult };
}

function emptyResult(): ProgressionResult {
  return {
    xpAwarded: 0,
    totalXp: 0,
    level: 1,
    leveledUp: false,
    newAchievements: [],
    streakDays: 0,
    streakMilestone: false,
    missionsCompleted: [],
  };
}
