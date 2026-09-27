"use client";

// ============================================================
// USE PLAYER NAME — имя для мультиплеер-игр
// ============================================================
// Приоритет: авторизованный username → сохранённое локально → пустая строка.
// Имя сохраняется в localStorage, чтобы при повторном заходе
// не спрашивать его снова.

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";

export function usePlayerName(storageKey: string): {
  name: string;
  setName: (v: string) => void;
  isAuthed: boolean;
} {
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return (
      localStorage.getItem(storageKey) ||
      localStorage.getItem("grid_player_name") ||
      localStorage.getItem("cs2_battle_name") ||
      localStorage.getItem("geo_mp_name") ||
      ""
    );
  });
  const [authApplied, setAuthApplied] = useState(false);

  // Авторизован: username всегда имеет приоритет над localStorage
  useEffect(() => {
    if (authLoading) return;
    if (user && !authApplied) {
      setName(user.username);
      setAuthApplied(true);
    }
  }, [user, authLoading, authApplied]);

  // Синхронизируем с localStorage при любом изменении
  useEffect(() => {
    if (name && typeof window !== "undefined") {
      localStorage.setItem(storageKey, name);
    }
  }, [name, storageKey]);

  return { name, setName, isAuthed: !!user };
}
