"use client";

// ============================================================
// SETTINGS PAGE
// ============================================================

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "./auth-provider";
import { getSupabaseBrowser } from "@/lib/auth";
import { Nav } from "./nav";

export default function SettingsPage() {
  const { user, loading, updateProfile, logout } = useAuth();
  const [username, setUsername] = useState(user?.username ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    if (username.trim().length < 3) {
      setError("Username: минимум 3 символа");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      await updateProfile({ username: username.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);

    // Delete profile and linked data
    const supabase = getSupabaseBrowser();
    if (supabase) {
      await supabase.from("user_profiles").delete().eq("id", user.id);
    }

    // Sign out
    await logout();

    // Redirect to home
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-stone-500 animate-pulse">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-stone-600">Вы не авторизованы</p>
        <Link
          href="/login"
          className="rounded-2xl bg-emerald-600 text-white font-black px-6 py-3 hover:bg-emerald-500 transition"
        >
          ВОЙТИ
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Навигация */}
      <div className="border-b border-stone-200 bg-white px-4 py-3">
        <Nav />
      </div>

      <div className="py-8 px-4">
        <div className="max-w-md mx-auto">
        <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-6 text-center">
            <h1 className="text-2xl font-black">НАСТРОЙКИ</h1>
          </div>

          <div className="p-6 space-y-6">
            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-2">
                USERNAME
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={20}
                  className="flex-1 rounded-xl border border-stone-300 px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 text-white font-black px-6 py-3 hover:bg-emerald-500 disabled:opacity-50 transition"
                >
                  {saving ? "..." : "СОХРАНИТЬ"}
                </button>
              </div>
              {saved && (
                <p className="mt-2 text-sm text-emerald-600">✓ Сохранено</p>
              )}
              {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-2">
                EMAIL
              </label>
              <div className="rounded-xl bg-stone-100 px-4 py-3 text-stone-600">
                {(user as any).email || "Не указан"}
              </div>
            </div>

            {/* Logout */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-2">
                ВЫХОД
              </label>
              <button
                onClick={logout}
                className="w-full rounded-2xl border-2 border-stone-300 text-stone-700 font-black py-3 hover:bg-stone-100 transition"
              >
                ВЫЙТИ
              </button>
            </div>

            {/* Delete account */}
            <div className="border-t border-stone-200 pt-4">
              <label className="block text-xs font-bold text-rose-600 mb-2">
                ОПАСНАЯ ЗОНА
              </label>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full rounded-2xl border-2 border-rose-300 text-rose-600 font-black py-3 hover:bg-rose-50 transition"
                >
                  УДАЛИТЬ АККАУНТ
                </button>
              ) : (
                <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-4">
                  <p className="text-sm text-rose-800 mb-3">
                    Вы уверены? Все данные будут удалены навсегда.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 rounded-xl bg-rose-600 text-white font-black py-3 hover:bg-rose-500 disabled:opacity-50 transition"
                    >
                      {deleting ? "УДАЛЯЮ..." : "ДА, УДАЛИТЬ"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded-xl border border-stone-300 text-stone-700 font-black py-3 hover:bg-stone-100 transition"
                    >
                      ОТМЕНА
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Link
            href="/"
            className="text-center text-sm text-stone-500 hover:text-stone-700"
          >
            ← Вернуться на главную
          </Link>
          <Link
            href="/profile"
            className="text-center text-sm text-stone-500 hover:text-stone-700"
          >
            → Вернуться к профилю
          </Link>
        </div>
        </div>
      </div>
    </div>
  );
}
