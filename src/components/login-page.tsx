"use client";

// ============================================================
// LOGIN PAGE
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "./auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, loading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Уже авторизован (после OAuth-редиректа) → сразу уводим туда, куда просили.
  // ВАЖНО: useEffect ДО всех условных return, иначе hooks называются
  // в разное число раз между рендерами → React crash.
  useEffect(() => {
    if (!loading && user) {
      router.replace(returnTo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  // Куда вернуть пользователя после входа (из ?returnTo= или ?redirect= в URL)
  const returnTo = (() => {
    if (typeof window === "undefined") return "/";
    const params = new URLSearchParams(window.location.search);
    const target = params.get("returnTo") || params.get("redirect") || "/";
    // Безопасность: только относительные пути
    if (!target.startsWith("/") || target.startsWith("//")) return "/";
    return target;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const { error } = await login(email, password);
      if (error) {
        setError(error);
      } else {
        router.push(returnTo);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setSubmitting(true);
    const { error } = await loginWithGoogle();
    if (error) {
      setError(error);
      setSubmitting(false);
    }
    // On success, user will be redirected by Supabase
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-stone-500 animate-pulse">Загрузка...</div>
      </div>
    );
  }

  if (!loading && user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-stone-500 animate-pulse">Вход выполнен…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Кнопка назад */}
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700"
        >
          ← Вернуться на главную
        </Link>

        <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-6 text-center">
            <small className="text-[11px] tracking-[0.25em] text-emerald-200">
              FOOTBALL DRAFT
            </small>
            <h1 className="mt-2 text-2xl font-black">ВОЙТИ</h1>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  ПАРОЛЬ
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-sm text-rose-600 bg-rose-50 rounded-lg p-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-emerald-600 text-white font-black py-3 hover:bg-emerald-500 disabled:opacity-50 transition"
              >
                {submitting ? "Вход..." : "ВОЙТИ"}
              </button>
            </form>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-stone-200" />
              <span className="text-xs text-stone-400">ИЛИ</span>
              <div className="flex-1 h-px bg-stone-200" />
            </div>

            <button
              onClick={handleGoogle}
              disabled={submitting}
              className="mt-4 w-full rounded-2xl border-2 border-stone-900 text-stone-900 font-black py-3 hover:bg-stone-100 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Войти через Google
            </button>

            <div className="mt-4 text-center text-sm text-stone-500">
              Нет аккаунта?{" "}
              <Link
                href="/register"
                className="font-bold text-emerald-600 hover:underline"
              >
                Зарегистрироваться
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
