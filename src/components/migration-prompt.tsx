"use client";

// ============================================================
// MIGRATION PROMPT — показывает приглашение перенести прогресс гостя
// ============================================================
// Показывается после регистрации/входа, если:
// 1. Есть гостевой прогресс в localStorage
// 2. Миграция ещё не выполнялась (migrated_from_device_id = null)
// ============================================================

import { useState, useEffect } from "react";
import { useAuth } from "./auth-provider";
import { getSupabaseBrowser } from "@/lib/auth";
import { levelFromXp } from "@/lib/xp";

export function MigrationPrompt() {
  const { user, deviceId, migrateGuest, refreshUser } = useAuth();
  const [show, setShow] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrated, setMigrated] = useState(false);
  const [guestXp, setGuestXp] = useState(0);

  useEffect(() => {
    if (!user) return;
    checkAndShow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const checkAndShow = async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !user) return;

    // Check if already migrated
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("migrated_from_device_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.migrated_from_device_id) {
      setMigrated(true);
      return;
    }

    // Check guest XP in Supabase (players_profile)
    try {
      const { data: guestProfile } = await supabase
        .from("players_profile")
        .select("xp, display_name")
        .eq("device_id", deviceId)
        .maybeSingle();

      const xp = guestProfile?.xp ?? 0;
      if (xp > 0) {
        setGuestXp(xp);
        setShow(true);
      }
    } catch {
      // ignore
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const result = await migrateGuest();
      if (result.success) {
        setMigrated(true);
        setShow(false);
        await refreshUser();
      }
    } finally {
      setMigrating(false);
    }
  };

  const handleSkip = () => {
    setShow(false);
  };

  if (!show || !user) return null;

  const guestLevel = levelFromXp(guestXp);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 text-center">
          <div className="text-4xl mb-2">📦</div>
          <h2 className="text-xl font-black">Перенести прогресс?</h2>
          <p className="mt-2 text-sm text-amber-100">
            У вас есть гостевой прогресс:
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2">
            <span className="text-2xl font-black">{guestXp}</span>
            <span className="text-sm">XP</span>
            <span className="text-sm">·</span>
            <span className="text-sm font-bold">Уровень {guestLevel}</span>
          </div>
        </div>

        <div className="p-6">
          <p className="text-sm text-stone-600 mb-4">
            Ваш гостевой прогресс будет добавлен к аккаунту. Это действие можно
            выполнить только один раз.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleMigrate}
              disabled={migrating}
              className="w-full rounded-2xl bg-emerald-600 text-white font-black py-3 hover:bg-emerald-500 disabled:opacity-50 transition"
            >
              {migrating ? "Переносим..." : "📦 ПЕРЕНЕСТИ ПРОГРЕСС"}
            </button>
            <button
              onClick={handleSkip}
              disabled={migrating}
              className="w-full rounded-2xl border border-stone-300 text-stone-600 font-bold py-3 hover:bg-stone-50 disabled:opacity-50 transition"
            >
              Пропустить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
