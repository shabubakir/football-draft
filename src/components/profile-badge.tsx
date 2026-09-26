"use client";

import { useEffect, useState } from "react";
import {
  ensureProfile,
  getDeviceId,
  levelOf,
  levelProgress,
  rankOf,
} from "@/lib/profile";

// Компактный бейдж прогресса игрока: имя + уровень + звание.
// Имя можно отредактировать — оно попадёт в общий рейтинг.
export function ProfileBadge() {
  const deviceId = getDeviceId();
  const [name, setName] = useState("");
  const [xp, setXp] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let cancel = false;
    setName(localStorage.getItem("fd_player_name") ?? "");
    ensureProfile(deviceId, name || undefined).then((p) => {
      if (!cancel) {
        if (p) {
          setXp(p.xp);
          if (p.display_name && !name) setName(p.display_name);
        }
      }
    });
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  const save = () => {
    const clean = draft.trim() || "Игрок";
    setName(clean);
    localStorage.setItem("fd_player_name", clean);
    import("@/lib/profile").then(({ renameProfile, addXp }) => {
      renameProfile(deviceId, clean);
    });
    setEditing(false);
  };

  const lvl = xp != null ? levelOf(xp) : null;
  const rank = xp != null ? rankOf(xp).title : null;
  const progress = xp != null ? levelProgress(xp) : 0;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white/70 px-3 py-2">
      {editing ? (
        <span className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            autoFocus
            placeholder="Ваше имя"
            className="w-36 rounded-lg border border-stone-300 px-2 py-1 text-sm outline-none focus:border-stone-500"
          />
          <button
            type="button"
            onClick={save}
            className="rounded-lg bg-stone-900 text-white text-xs font-bold px-2.5 py-1.5"
          >
            ОК
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
          className="text-left group"
          title="Изменить имя"
        >
          <span className="block text-sm font-bold text-stone-900">
            {name || "Игрок"}{" "}
            <span className="text-[10px] text-stone-400 group-hover:text-stone-600">
              ✎
            </span>
          </span>
          {rank && (
            <span className="block text-[10px] text-stone-500">
              ур. {lvl} · {rank}
            </span>
          )}
        </button>
      )}
      {xp != null && (
        <span className="w-16">
          <span className="block h-1.5 rounded-full bg-stone-200 overflow-hidden">
            <span
              className="block h-full bg-emerald-500"
              style={{ width: `${progress}%` }}
            />
          </span>
          <small className="text-[9px] text-stone-400">{xp} XP</small>
        </span>
      )}
    </div>
  );
}
